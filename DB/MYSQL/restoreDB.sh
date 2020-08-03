if [ -z "$1" ]
then
      echo "You must pass 4 arguments: DBUSER, DBPASSWORD, DBNAME, PATH";
      echo "Eg: ./restoreDB.sh MyUser MyPassword MyDB backup.sql";
else
      cat $4 | docker exec -i mysql80 /usr/bin/mysql --user=$1 --password=$2 $3
fi


