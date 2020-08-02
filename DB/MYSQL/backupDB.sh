if [ -z "$1" ]
then
      echo "You must pass 3 arguments: DBUSER, DBPASSWORD, DBNAME";
      echo "Eg: ./backupDB.sh MyUser MyPassword MyDB";
else
      docker exec mysql80 /usr/bin/mysqldump --no-tablespaces --user=$1 --password=$2 $3 > $3.sql
fi