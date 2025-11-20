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

