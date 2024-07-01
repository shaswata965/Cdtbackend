# Confident Drivers Trainig Backend

## Table of Content

- [API Endpoints](#api_endpoints)
- [Usage](#usage)

## API Endpoints

You can find all the API end points in route folder, divided into three files.

- admin-routes, holds all of the API endpoints for admin routes.
- dashboard-routes, holds all of the API endpoints for user dashbaord routes.
- home-routes, holds all of the API endpoints for

#### Home API Endpoints

##### Post Requestes

- `/appointment/:uid` takes a user id or guest name to create a appointment entry in the database. The user id field is used to link it to appropriate user entity. The guest indicates an independent entity that can be later replaced with a user id through admin panel.

- `/signup` takes a body with necessary user info to create a user entity. This entity is initiated with "PENDING" as account status.

- `/login` takes a body with email and password as body. This queries the User collection to find the user with email and then matches the hashed password. If the user still has a pending account status, it will return an error.

- `/forget-password` takes a email address related to the account with forgotten password, and sends a token to the email address.

- `/reset-password` if the link is valid it will update the password for that user.

- `/contact` it takes a body with name, message and email and creates a new contact entity.

#### Admin API Endpoints

##### Get Requests

- `/admin/all` responds with a list of all admins, from all roles.

- `/info/:aId` responds with a info of the admin of the given admin id.

- `/user/all` responds with a list of all users.

- `/course/all` responds with a list of all courses.

- `/appointment/all` responds with a list of all appointments.
- `/course/info/:cid` responds with the detail of the course with the course id.
- `/user-paydue/:uid` responds with the due of an user.

- `/user-info/search/:info` responds with user matching the query string.

##### Patch Requests

- `/user/info/:uid` updates user's attributes with the provided body.
- `/info/:aid` updates the admin's info with the provided body.
- `/user/updateStatus/:uid` updates the user's status as provided.
- `/appointment/updateStatus/:aid` updates the appointment's status as provided.

##### Post Requests

- `/user-appointment/link/:aid` links guest created appointments with users.
- `/user/create/assessment` creates a new assessment for the user.
- `/signup` creates a new admin.
- `/course-create` creates a new course.
- `/delay-appointment/:sid/:tid` delays an appointment.
- `/userCourse/add/:uid` creates a suggested course for a user.
- `/userCourse/remove/:uid` removes suggested course for a user.

##### Delete Requests

- `/user/delete/:uid` delete a user with provided id.
- `/admin/delete/:aid` delete a admin with provided id.
- `/course/delete/:cid` delete a course with provided id.
- `/appointment/delete/:aid` delete an appointment with provided id.

#### Dashboard Routes

##### Get Requests

- `/user/info/:uid` get user info with the given id.
- `/course/info/all` get a list of all available courses.
- `/appointment/:day` get a list of all the appointments in a given day.
- `/appointment/info/:aid` get information of an appointment.
- `/appointment/all/:uid` get a list of all the appointmnets for the user with the provided id.
- `/assessment/info/:aid` get the assessment information for the appointment with the provided id.
- `/initial-assessment/:uid` get the initial assesment for the first lesson.
- `/appointment/times/:startTime` get appointments based on the start time.
- `/course/info/:cname` get information of a course based on the course name.

##### Patch Requests

- `/user/info/:uid` update cover photo and profile photo along with information regarding a profile.
- `/user/password/:uid` update user password.
- `/appointment/status/:aid` update appointment status to provided status in the body of the request.
- `/appointment/payment/:aid` updates an appointments payment information.

##### Post Requests

- `/user-lesson/:uid` process the information regarding purcchaing of lessons.
- `/appointment/create-customer-intent` create customer intent to make payments.

##### Delete Requests

- `/appointment/delete/:aid` delete appointment through user request.
- `/appointment/:aid` delete appointment through automatic detection of user actions.

## Usage

### Step 1

- Clone Repository to local machine.

### Step 2

- Run `npm install`

### Step 3

#### Set Up environement variables.

- `DB_USER` . This is the mongoDB atlas database user name.
- `DB_PASSWORD` . This is the password for the same database.
- `DB_NAME` . Collection name where you want to post your data.
- `STRIPE_SECRET_KEY`. This is the secret key found in your stripe dasboard.
- `ADMIN_SECRET_KEY`. This is the admin secret key for JWT token verification, regarding admin actions.
- `USER_SECRET_KEY`. This is the user secret key for JWT token verification, regarding user actions.
- `BUCKET_NAME`. This is the bucket name for your aws services.
- `BUCKET_REGION`. This is the region name for your aws bucket.
- `AWS_ACESS_KEY`. This is the aws access key that manages the actions for this application.
- `AWS_SECRET_ACESS_KEY`. This is the secret access key for the same profile managing the application.
- `POSTMARK_SECRET_KEY`. This is the secret key for postmark dashbaord, this is required for managing the email part of the application.
- `DOMAIN_EMAIL_ADDRESS`. This is your email address related to your domain and is setup with postmark.
  The last two can be replaced with AWS SES if you have them setup.

### Step 4

- Run `nodemon start` to run the server.
