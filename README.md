# 🎲 👹 The Database Thing
<img src="public/demo.png"/>


###### What does the database thing do ?
- Backup/restore your database with an interative UI
- List all backups files in AWS S3
- Create a CRON to schedule automatic backups 
- Clear all redis keys after database update

## How to run

#### Run app
> Create .env file, run prisma migrations, and finally run the app
```bash
cp .env.example .env # Create .env and modify the AWS credentials.
npm install # install deps
npx prisma migrate dev # Create migrations in database
npm run dev # Run app
```

> The way I'm running in my env is using PM2

#### Todo List

- [x] Cleanup S3 after finished backup 
- [x] Limit S3 backups according settings in sqlite 
- [x] Whatsapp Notifications `(using CURL)`
- [x] CURL after success can be any script configured via ui (usefull for notifications via api)
- [x] Cron
- [x] Store tag with a desired table in s3 with the count of it (helpfull for detect how many records have been added, and the last one)
- [x] List S3 backups
- [x] Button to backup
- [x] Restore selecting backup file via ui
- [x] Button to remove S3 backup via ui
- [x] Add device alias to file name
- [x] Delete local Files
- [ ] Create `Dockerfile/docker-compose` ?