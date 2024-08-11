git reset --hard
git pull origin master
pm2 restart db
pm2 logs db