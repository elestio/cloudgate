if [ -z "$1" ]
then
      echo "You must pass 3 arguments: DBUSER, DBPASSWORD, DBNAME";
      echo "Eg: ./restoreDB.sh MyUser MyPassword MyDB";
else
      cat $3.sql | docker exec -i mysql80 /usr/bin/mysql --user=$1 --password=$2 $3
fi


