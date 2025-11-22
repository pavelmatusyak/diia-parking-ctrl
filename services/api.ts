import { clearAuthToken, getAuthToken, setAuthToken } from './auth';

type SubmitInitialReportPayload = { photoUri: string; latitude: number; longitude: number; };
export type InitialReportResponse = { violation_id: string;[key: string]: any; };
type SubmitViolationDetailsPayload = { violationId: string; reason: string; hasSupportingSigns?: boolean; note?: string; latitude?: number; longitude?: number; };
type CreateViolationPayload = { latitude: number; longitude: number; };
type CreateViolationResponse = { violation_id?: string; id?: string;[key: string]: any; };
type UploadPhotoResponse = { photo_id?: string;[key: string]: any; };
type SubmitViolationPayload = { reason: string; has_supporting_signs?: boolean; note?: string; latitude?: number; longitude?: number; };
type AnonymousAuthResponse = { access_token?: string; token_type?: string;[key: string]: any; };

let BASE_URL: string = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? '';
if (BASE_URL.includes('/api/docs')) BASE_URL = BASE_URL.replace(/\/api\/docs\/?$/, '');
const API_BASE = BASE_URL ? `${BASE_URL}/api/v1` : '';
const AUTH_ENDPOINT = `${API_BASE}/auth/anonymous`;
const VIOLATIONS_ENDPOINT = `${API_BASE}/violations`;
const OCR_ENDPOINT = `${API_BASE}/ocr/analyze`;
const GEOCODING_ENDPOINT = `${API_BASE}/geocoding/reverse`;
const PARKING_ANALYSIS_ENDPOINT = `${API_BASE}/parking-analysis/analyze`;
const DEFAULT_HEADERS = { Accept: 'application/json' };

async function getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getAuthToken();
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

async function ensureAuthenticated(): Promise<void> {
    const existingToken = await getAuthToken();
    if (existingToken) return;

    const response = await fetch(AUTH_ENDPOINT, { method: 'POST', headers: DEFAULT_HEADERS });
    if (!response.ok) throw new Error(`Помилка автентифікації: ${await response.text().catch(() => `HTTP ${response.status}`)}`);

    const data: AnonymousAuthResponse = await response.json();
    const token: string = data.access_token ?? data.token ?? (data as any).accessToken ?? (data as any).data?.access_token;
    if (!token) throw new Error('Токен не отримано від сервера');
    await setAuthToken(token);
}

const throwIfNotOk = async (response: Response) => {
    if (!response.ok) {
        if (response.status === 401) await clearAuthToken();
        throw new Error(await response.text().catch(() => `HTTP ${response.status}`));
    }
};

async function fetchJson(url: string, options: RequestInit) {
    let response: Response;
    try { response = await fetch(url, options); }
    catch { throw new Error('Немає підключення до сервера'); }
    await throwIfNotOk(response);
    try { return await response.json(); } catch { return {}; }
}

async function createViolation(payload: CreateViolationPayload): Promise<CreateViolationResponse> {
    await ensureAuthenticated();
    const headers = { ...await getAuthHeaders(), 'Content-Type': 'application/json' };
    const data = await fetchJson(VIOLATIONS_ENDPOINT, { method: 'POST', headers, body: JSON.stringify(payload) });
    const violationId: string = data?.violation_id ?? data?.id ?? data?.data?.violation_id ?? data?.data?.id;
    if (!violationId) throw new Error('Сервер не повернув ідентифікатор порушення');
    return { ...data, violation_id: violationId, id: violationId };
}

async function uploadViolationPhoto(violationId: string, photoUri: string, isSignPhoto = false): Promise<UploadPhotoResponse> {
    await ensureAuthenticated();
    const headers = await getAuthHeaders();
    const endpoint = isSignPhoto ? `${VIOLATIONS_ENDPOINT}/${violationId}/sign-photo` : `${VIOLATIONS_ENDPOINT}/${violationId}/photos`;
    if (!photoUri?.trim()) throw new Error('URI фото не вказано');
    const formData = new FormData();
    formData.append('photo', { uri: photoUri, type: 'image/jpeg', name: 'violation.jpg' } as any);
    return fetchJson(endpoint, { method: 'POST', headers, body: formData });
}

async function submitViolation(violationId: string, payload: SubmitViolationPayload) {
    await ensureAuthenticated();
    const headers = { ...await getAuthHeaders(), 'Content-Type': 'application/json' };
    return fetchJson(`${VIOLATIONS_ENDPOINT}/${violationId}/submit`, { method: 'PUT', headers, body: JSON.stringify(payload) });
}

async function submitToPolice(violationId: string) {
    await ensureAuthenticated();
    const headers = await getAuthHeaders();
    return fetchJson(`${VIOLATIONS_ENDPOINT}/${violationId}/submit-to-police`, { method: 'POST', headers });
}

export async function submitInitialReport({ photoUri, latitude, longitude }: SubmitInitialReportPayload): Promise<InitialReportResponse> {
    if (!BASE_URL?.trim()) throw new Error('Бекенд не налаштовано');
    if (!photoUri?.trim()) throw new Error('Фото не вказано');
    if (typeof latitude !== 'number' || typeof longitude !== 'number') throw new Error('Некоректні координати');
    const violation = await createViolation({ latitude, longitude });
    const violationId: string = violation.violation_id!;
    await uploadViolationPhoto(violationId, photoUri);
    return { violation_id: violationId, reportId: violationId };
}

export async function submitViolationDetails(payload: SubmitViolationDetailsPayload) {
    if (!BASE_URL?.trim()) throw new Error('Бекенд не налаштовано');
    const { violationId, reason, hasSupportingSigns, note, latitude, longitude } = payload;
    if (!violationId?.trim()) throw new Error('Відсутній ідентифікатор порушення');
    if (!reason?.trim()) throw new Error('Не вказано причину правопорушення');
    await submitViolation(violationId, { reason, has_supporting_signs: hasSupportingSigns, note, latitude, longitude });
    await submitToPolice(violationId);
}

export async function analyzeLicensePlate(photoUri: string) {
    await ensureAuthenticated();
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('photo', { uri: photoUri, type: 'image/jpeg', name: 'plate.jpg' } as any);
    return fetchJson(OCR_ENDPOINT, { method: 'POST', headers, body: formData });
}

export async function reverseGeocode(latitude: number, longitude: number) {
    await ensureAuthenticated();
    const headers = { ...await getAuthHeaders(), 'Content-Type': 'application/json' };
    return fetchJson(GEOCODING_ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ latitude, longitude }) });
}

export async function uploadSignPhoto(violationId: string, photoUri: string) {
    return uploadViolationPhoto(violationId, photoUri, true);
}

export async function analyzeParking(photoUri: string, latitude?: number, longitude?: number) {
    await ensureAuthenticated();
    const headers = await getAuthHeaders();
    const formData = new FormData();
    formData.append('photo', { uri: photoUri, type: 'image/jpeg', name: 'parking.jpg' } as any);
    if (latitude !== undefined) formData.append('latitude', String(latitude));
    if (longitude !== undefined) formData.append('longitude', String(longitude));
    return fetchJson(PARKING_ANALYSIS_ENDPOINT, { method: 'POST', headers, body: formData });
}
