import { clearAuthToken, getAuthToken, setAuthToken } from './auth';

// -------------------------
// Базова URL змінна з .env
// -------------------------
const BASE_URL: string = process.env.EXPO_PUBLIC_BACKEND_URL?.replace(/\/$/, '') ?? '';
const API_BASE = BASE_URL ? `${BASE_URL}/api/v1` : '';

// -------------------------
// Endpoint’и
// -------------------------
const AUTH_ENDPOINT = `${API_BASE}/auth/anonymous`;
const VIOLATIONS_ENDPOINT = `${API_BASE}/violations`;
const PARKING_ANALYSIS_ENDPOINT = `${API_BASE}/parking-analysis/analyze`;

const DEFAULT_HEADERS = { Accept: 'application/json' };

// -------------------------
// Типи
// -------------------------
export type AuthResponse = {
    access_token: string;
    token_type: string;
    user_id: string;
    diia_user_id: string;
    name: string;
    is_anonymous: boolean;
};

export type ViolationResponse = {
    id: string;
    user_id: string;
    status: string;
    license_plate?: string;
    license_plate_confidence?: number;
    latitude: number;
    longitude: number;
    address?: string;
    created_at: string;
    notes?: string;
    has_road_sign_photo: boolean;
};

export type OCRResults = {
    bbox: { x1: number; x2: number; y1: number; y2: number };
    code: number;
    confidence: number;
    message: string;
    plate: string;
    status: string;
};

export type PhotoResponse = {
    id: string;
    violation_id: string;
    photo_type: 'initial' | 'context';
    storage_url: string;
    file_size: number;
    mime_type: string;
    uploaded_at: string;
    ocr_results?: OCRResults;
};

export type AnalysisResponse = {
    isViolation: boolean;
    overallViolationConfidence: number;
    likelyArticles: string[];
    probabilityBreakdown: Record<string, number>;
    reasons: { source: string; detail: string }[];
    crossChecks: any;
    finalHumanReadableConclusion: string;
};

export type SubmitViolationPayload = {
    violations: {
        violation_reason: string;
        violation_code: string;
        violation_type: string;
    }[];
    notes?: string;
};

export type SubmitResponse = {
    id: string;
    status: string;
    submitted_at: string;
    pdf_url?: string;
    detail?: string;
};

export type TimerStartResponse = {
    timer_started_at: string;
    timer_expires_at: string;
};

export type TimerStatusResponse = {
    timer_required: boolean;
    timer_started_at?: string;
    timer_expires_at?: string;
    seconds_remaining: number;
    can_submit: boolean;
};

export type EvidenceResponse = {
    violation_id: string;
    license_plate: string;
    location: { latitude: number; longitude: number; address?: string };
    photos: { id: string; type: string; url: string; captured_at?: string }[];
    violations: { violation_reason: string; violation_code: string; violation_type: string }[];
    created_at: string;
};

export type PdfResponse = {
    pdf_url: string;
    expires_at: string;
};

// -------------------------
// Хелпери
// -------------------------
async function getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getAuthToken();
    const headers: Record<string, string> = { ...DEFAULT_HEADERS };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
}

async function fetchJson(url: string, options: RequestInit) {
    console.log(`[API] ${options.method || 'GET'} ${url}`);
    try {
        const response = await fetch(url, options);

        if (response.status === 401) {
            await clearAuthToken();
            throw new Error('Unauthorized');
        }

        const data = await response.json();

        if (!response.ok) {
            throw { status: response.status, data };
        }

        return data;
    } catch (error: any) {
        console.error('[API] Request failed:', error);
        throw error;
    }
}

// -------------------------
// API Methods
// -------------------------
export async function authenticateAnonymous(): Promise<AuthResponse> {
    const response = await fetch(AUTH_ENDPOINT, {
        method: 'POST',
        headers: DEFAULT_HEADERS,
        body: ''
    });
    const data = await response.json();
    if (!response.ok) throw new Error('Auth failed');
    await setAuthToken(data.access_token);
    return data;
}

export async function createViolation(latitude: number, longitude: number, notes?: string): Promise<ViolationResponse> {
    const headers = await getAuthHeaders();
    return fetchJson(VIOLATIONS_ENDPOINT, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, notes })
    });
}

export async function getUserViolations(): Promise<ViolationResponse[]> {
    const headers = await getAuthHeaders();
    return fetchJson(`${API_BASE}/users/me/violations`, {
        method: 'GET',
        headers
    });
}

export async function uploadViolationPhoto(
    violationId: string,
    photoUri: string,
    type: 'initial' | 'context' = 'initial'
): Promise<PhotoResponse> {
    const headers = await getAuthHeaders();
    delete headers['Content-Type'];

    const formData = new FormData();

    if (typeof window !== 'undefined' && (photoUri.startsWith('data:') || photoUri.startsWith('blob:'))) {
        const response = await fetch(photoUri);
        const blob = await response.blob();
        formData.append('file', blob, 'photo.jpg');
    } else {
        formData.append('file', { uri: photoUri, type: 'image/jpeg', name: 'photo.jpg' } as any);
    }

    const endpoint = type === 'initial'
        ? `${VIOLATIONS_ENDPOINT}/${violationId}/photos?photo_type=initial`
        : `${VIOLATIONS_ENDPOINT}/${violationId}/sign-photo`;

    return fetchJson(endpoint, {
        method: 'POST',
        headers,
        body: formData
    });
}

export async function analyzeParking(violationId: string): Promise<AnalysisResponse> {
    const headers = await getAuthHeaders();
    return fetchJson(PARKING_ANALYSIS_ENDPOINT, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ violation_id: violationId })
    });
}

export async function submitViolation(violationId: string, payload: SubmitViolationPayload): Promise<SubmitResponse> {
    const headers = await getAuthHeaders();
    return fetchJson(`${VIOLATIONS_ENDPOINT}/${violationId}/submit`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

export async function startTimer(violationId: string): Promise<TimerStartResponse> {
    const headers = await getAuthHeaders();
    return fetchJson(`${VIOLATIONS_ENDPOINT}/${violationId}/start-timer`, {
        method: 'POST',
        headers,
        body: ''
    });
}

export async function getTimerStatus(violationId: string): Promise<TimerStatusResponse> {
    const headers = await getAuthHeaders();
    return fetchJson(`${VIOLATIONS_ENDPOINT}/${violationId}/timer-status`, {
        method: 'GET',
        headers
    });
}

export async function getEvidence(violationId: string): Promise<EvidenceResponse> {
    const headers = await getAuthHeaders();
    return fetchJson(`${VIOLATIONS_ENDPOINT}/${violationId}/evidence`, {
        method: 'GET',
        headers
    });
}

export async function getViolationPdf(violationId: string): Promise<PdfResponse> {
    const headers = await getAuthHeaders();
    return fetchJson(`${VIOLATIONS_ENDPOINT}/${violationId}/pdf`, {
        method: 'GET',
        headers,
    });
}

// Legacy
export async function ensureAuthenticated() {
    const token = await getAuthToken();
    if (!token) await authenticateAnonymous();
}
