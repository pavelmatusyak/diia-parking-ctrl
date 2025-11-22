We want to build an app
The app has flows:

On the frontend there is an AUTH - then it is hadnled by load balancer separately.
FOlder backend contains an app that will be running in local network and the load balancer is the only one with access to this one
THere will be JWT auth or maybe google auth or sth else. Backend gets jwt token with user details
JWT token structure is not defined yet.
Frontend calls and endpoint structure is not defined yet

The flow is:
User selects a geolocation - latitude longitue, street address
User makes a photo (it can be one or more)
After each photo is made a request to the backend is made 
Then we need to call OCR service. Which is running in internal network and not implemented yet
You can mock it's api results json like 
OCR service specs:
```
буде один запит, тому що моделі працюють досить швидко

/detect

Request:
file - просто прикріплюємо файл картинки чи посилання на картинку до запиту


Response:

{
  "status": "OK",  # опис статуса / помилки
  "code": 0,  # код, для повідомлення для юзера, на випадок коли зробив нерозбірлеве фото і таке інше
  "plate": "XX0000XX",
  "confidence": 0.89,  # якщо конфіденс маленький теж можна юзера повідомити

  # In plan / optional 1st step
  "color": "red",
  "colorId": 4, # потрібно для звернення у поліцію, мабуть зможемо визначати і колір якщо вистачить часу, потім зкину список кольорів


  #In plan / optional 2nd step
  "make": "bmw",
  "model": "x5",


  #In plan / optional 3d step
  "violated": [2,3] # violated traffic rules id from the violation list
}
```
It's a pretty quick request under few seconds
Then if the image was unsuccessfull, backend returns an error message to user with details why recognition failed. Details from the OCR servicel

Then if the image was successfull, we proceed with the flow.
The next step is that user in the app selects if there are any road signs. 
- If there are signs - user makes another photo. For this image there is no need for OCR it's just for tracking purposes.
Then we proceed to TASK_2
- If there are no signs we go to TASK_3
TASK_2: Select the reason for violation:
- There is a select on the UI, the text or some code is sent to backend in the request.
User clicks on the Submit button and all the information together is sent to backend. At this moment we should have geolocation and some images on the baackend with relation to user and this ticket submission
Then process to FINAL_TASK
- 
TASK_3:
User didn't made a second image the proves that the car is parcked incorrectly. So no the UI the 5 min timer starts and user needs to wait for that time. 
After 5 minutes user has an ability to make a new image. He makes and process
Then processed to FINAL_TASK

FINAL_TASK:
Frontend gathers and sends all details to backend. Note that by now we should already have geolocation and some images on the backend related to that user to that ticket submission

We use AWS as cloud provider for hostiing. We wanna use S3 for image storage (Minio for local development  mocks maybe)
And S3 for sotring generated PDF reports and other artifacts. 
In the postgres database everything is tracked for user.

On the APP user should have an ability to preview PDFs securily. 
THat is a PDF download link from S3 that will be protected by sth.

On the generated PDF report there should be 
- User name, email or phone (that is available from the APP since user is registerred in the system)
- All images of car viloation
- violation reason 
- Timestamp
- other details or comments 

We don't need any openai chatbots - this logic can be removed. 

Step 1: Get anonym login
```bash
curl -X 'POST' \
  'http://localhost:8021/api/v1/auth/anonymous' \
  -H 'accept: application/json' \
  -d ''
```


```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzkyYmM5MS1mZDQyLTQ4NmMtOGU4My0zYmQ3NmQwMGNiYjMiLCJkaWlhX3VzZXJfaWQiOiJhbm9uLWIzYjdmYTlkIiwibmFtZSI6Ilx1MDQyMlx1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQzZVx1MDQzMlx1MDQzOFx1MDQzOSBcdTA0MWFcdTA0M2VcdTA0NDBcdTA0MzhcdTA0NDFcdTA0NDJcdTA0NDNcdTA0MzJcdTA0MzBcdTA0NDciLCJpc19hbm9ueW1vdXMiOnRydWUsImV4cCI6MTc2MzgwNTEwN30.Qn5nOAltFR2ev0ekOHcjVIxF6YRHLpqBo3hHx3pDTU4",
  "token_type": "bearer",
  "user_id": "8792bc91-fd42-486c-8e83-3bd76d00cbb3",
  "diia_user_id": "anon-b3b7fa9d",
  "name": "Тестовий Користувач",
  "is_anonymous": true
}
```


STEP 2: CREATE VIOLATION STEP

```bash
curl -X 'POST' \
  'http://localhost:8021/api/v1/violations' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzkyYmM5MS1mZDQyLTQ4NmMtOGU4My0zYmQ3NmQwMGNiYjMiLCJkaWlhX3VzZXJfaWQiOiJhbm9uLWIzYjdmYTlkIiwibmFtZSI6Ilx1MDQyMlx1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQzZVx1MDQzMlx1MDQzOFx1MDQzOSBcdTA0MWFcdTA0M2VcdTA0NDBcdTA0MzhcdTA0NDFcdTA0NDJcdTA0NDNcdTA0MzJcdTA0MzBcdTA0NDciLCJpc19hbm9ueW1vdXMiOnRydWUsImV4cCI6MTc2MzgwNTEwN30.Qn5nOAltFR2ev0ekOHcjVIxF6YRHLpqBo3hHx3pDTU4' \
  -H 'Content-Type: application/json' \
  -d '{
  "latitude": -90,
  "longitude": -180,
  "notes": "THIS WILL BE ADDRESS STREET TEXT"
}'
```

```json
{
  "id": "662b59ea-c426-454e-87f3-23eb5f2349dc",
  "user_id": "8792bc91-fd42-486c-8e83-3bd76d00cbb3",
  "status": "draft",
  "license_plate": null,
  "license_plate_confidence": null,
  "latitude": -90,
  "longitude": -180,
  "address": null,
  "created_at": "2025-11-22T09:22:42.482739",
  "verified_at": null,
  "submitted_at": null,
  "resolved_at": null,
  "verification_time_seconds": null,
  "police_case_number": null,
  "notes": "THIS WILL BE ADDRESS STREET TEXT",
  "violation_reason": null,
  "violation_code": null,
  "violation_type": null,
  "timer_started_at": null,
  "has_road_sign_photo": false
}
```


Remember ID - this is violation id used for all other requests

```bash
curl -X 'POST' \
  'http://localhost:8021/api/v1/violations/662b59ea-c426-454e-87f3-23eb5f2349dc/photos?photo_type=initial' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzkyYmM5MS1mZDQyLTQ4NmMtOGU4My0zYmQ3NmQwMGNiYjMiLCJkaWlhX3VzZXJfaWQiOiJhbm9uLWIzYjdmYTlkIiwibmFtZSI6Ilx1MDQyMlx1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQzZVx1MDQzMlx1MDQzOFx1MDQzOSBcdTA0MWFcdTA0M2VcdTA0NDBcdTA0MzhcdTA0NDFcdTA0NDJcdTA0NDNcdTA0MzJcdTA0MzBcdTA0NDciLCJpc19hbm9ueW1vdXMiOnRydWUsImV4cCI6MTc2MzgwNTEwN30.Qn5nOAltFR2ev0ekOHcjVIxF6YRHLpqBo3hHx3pDTU4' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@img_1.png;type=image/png'
```


```bash
curl -X 'POST' \
  'http://localhost:8021/api/v1/violations/662b59ea-c426-454e-87f3-23eb5f2349dc/photos?photo_type=initial' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzkyYmM5MS1mZDQyLTQ4NmMtOGU4My0zYmQ3NmQwMGNiYjMiLCJkaWlhX3VzZXJfaWQiOiJhbm9uLWIzYjdmYTlkIiwibmFtZSI6Ilx1MDQyMlx1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQzZVx1MDQzMlx1MDQzOFx1MDQzOSBcdTA0MWFcdTA0M2VcdTA0NDBcdTA0MzhcdTA0NDFcdTA0NDJcdTA0NDNcdTA0MzJcdTA0MzBcdTA0NDciLCJpc19hbm9ueW1vdXMiOnRydWUsImV4cCI6MTc2MzgwNTEwN30.Qn5nOAltFR2ev0ekOHcjVIxF6YRHLpqBo3hHx3pDTU4' \
  -H 'Content-Type: multipart/form-data' \
  -F 'file=@img_1.png;type=image/png'
```

```json
{
  "id": "55cf7ffb-45f6-4e2c-a2dd-1a4b5335568d",
  "violation_id": "662b59ea-c426-454e-87f3-23eb5f2349dc",
  "photo_type": "initial",
  "storage_url": "http://localhost:8000/storage/violations/662b59ea-c426-454e-87f3-23eb5f2349dc/20251122-093350-e707db51-img_1.png",
  "file_size": 54612841,
  "mime_type": "image/png",
  "latitude": null,
  "longitude": null,
  "captured_at": null,
  "uploaded_at": "2025-11-22T09:33:50.688628",
  "ocr_results": {
    "bbox": {
      "x1": 403,
      "x2": 562,
      "y1": 1389,
      "y2": 1506
    },
    "code": 0,
    "confidence": 0.96,
    "message": "Success",
    "plate": "KA1488XI",
    "status": "OK"
  }
}
```

If no plate or confidence is < 0.3 -> Fronetnd should say "не вдалося рохпізнати"



If all good FE does 

```bash
curl -X 'POST' \
  'http://localhost:8021/api/v1/parking-analysis/analyze' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzkyYmM5MS1mZDQyLTQ4NmMtOGU4My0zYmQ3NmQwMGNiYjMiLCJkaWlhX3VzZXJfaWQiOiJhbm9uLWIzYjdmYTlkIiwibmFtZSI6Ilx1MDQyMlx1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQzZVx1MDQzMlx1MDQzOFx1MDQzOSBcdTA0MWFcdTA0M2VcdTA0NDBcdTA0MzhcdTA0NDFcdTA0NDJcdTA0NDNcdTA0MzJcdTA0MzBcdTA0NDciLCJpc19hbm9ueW1vdXMiOnRydWUsImV4cCI6MTc2MzgwNTEwN30.Qn5nOAltFR2ev0ekOHcjVIxF6YRHLpqBo3hHx3pDTU4' \
  -H 'Content-Type: application/json' \
  -d '{
  "violation_id": "662b59ea-c426-454e-87f3-23eb5f2349dc"
}'
```

```json
{
  "isViolation": false,
  "overallViolationConfidence": 0,
  "likelyArticles": [],
  "probabilityBreakdown": {
    "railway_crossing": 0,
    "tram_track": 0,
    "bridge_or_tunnel": 0,
    "pedestrian_crossing_10m": 0,
    "intersection_10m": 0,
    "narrowing_less_than_3m": 0,
    "bus_stop_30m": 0,
    "driveway_exit_10m": 0,
    "sidewalk": 0,
    "pedestrian_zone": 0,
    "cycleway": 0,
    "blocking_traffic_signal": 0,
    "blocking_roadway": 0
  },
  "reasons": [
    {
      "source": "rule_engine",
      "detail": "Rule-engine не виявив жодних порушень або об'єктів поблизу."
    },
    {
      "source": "map_analysis",
      "detail": "На статичній карті немає ознак наявності залізничного переїзду, трамвайних колій, мосту, тунелю, пішохідного переходу, перехрестя, звуження проїжджої частини, зупинки транспорту, виїзду з прилеглої території, тротуару, пішохідної зони, велодоріжки, світлофора чи дорожніх знаків, а також блокування проїзду."
    }
  ],
  "crossChecks": {
    "map_vs_photo": "не застосовується (немає фото)",
    "map_vs_rule_engine": "Дані rule-engine та карта узгоджуються: жодних ознак порушень не виявлено.",
    "photo_vs_rule_engine": "не застосовується (немає фото)"
  },
  "finalHumanReadableConclusion": "Порушень правил дорожнього руху на основі наданих даних не виявлено. Ознак порушень за жодним із критеріїв немає."
}
```


```bash
curl -X 'GET' \
  'http://localhost:8021/api/v1/violations/662b59ea-c426-454e-87f3-23eb5f2349dc/evidence' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NzkyYmM5MS1mZDQyLTQ4NmMtOGU4My0zYmQ3NmQwMGNiYjMiLCJkaWlhX3VzZXJfaWQiOiJhbm9uLWIzYjdmYTlkIiwibmFtZSI6Ilx1MDQyMlx1MDQzNVx1MDQ0MVx1MDQ0Mlx1MDQzZVx1MDQzMlx1MDQzOFx1MDQzOSBcdTA0MWFcdTA0M2VcdTA0NDBcdTA0MzhcdTA0NDFcdTA0NDJcdTA0NDNcdTA0MzJcdTA0MzBcdTA0NDciLCJpc19hbm9ueW1vdXMiOnRydWUsImV4cCI6MTc2MzgwNTEwN30.Qn5nOAltFR2ev0ekOHcjVIxF6YRHLpqBo3hHx3pDTU4'
```


```json
{
  "violation_id": "662b59ea-c426-454e-87f3-23eb5f2349dc",
  "license_plate": "KA1488XI",
  "location": {
    "latitude": -90,
    "longitude": -180,
    "address": null
  },
  "photos": [
    {
      "id": "55cf7ffb-45f6-4e2c-a2dd-1a4b5335568d",
      "type": "initial",
      "url": "http://localhost:8000/storage/violations/662b59ea-c426-454e-87f3-23eb5f2349dc/20251122-093350-e707db51-img_1.png",
      "captured_at": null
    }
  ],
  "verification_time_seconds": null,
  "created_at": "2025-11-22T09:22:42.482739",
  "verified_at": null
}
```

 