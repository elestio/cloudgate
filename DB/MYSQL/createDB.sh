if [ -z "$1" ]
then
      echo "You must pass 3 arguments: DBUSER, DBPASSWORD, DBNAME, PATH";
      echo "Eg: ./backupDB.sh MyUser MyPassword MyDB backup.sql";
else
      docker exec mysql80 /usr/bin/mysqldump --no-tablespaces --user=$1 --password=$2 $3 > $4
fi