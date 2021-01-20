
main() {
    
    PomptUser;

    #IF the data folder is not empty, root password will be the old one ...
    if emptydir $DBPATH
    then
        echo "Data dir is empty!";
        GenerateNewConfig;
    else 
        echo "directory is not empty, keeping previous configuration and data (config.json)" ;
    fi

    InstallOrCleanDocker;
    startContainer;

    ##TODO: set global config to allow std behavior of MySQL
    ## SET sql_mode = ''; SET GLOBAL sql_mode = '';

    
    echo "";
    echo "You can now connect to the mysql cli like this: ./mysql-docker-cli.sh";
}

function PomptUser {
    echo "Press enter to use the default value"

    ##INTERFACE
    read -p "NETWORK INTERFACE TO LISTEN TO [172.17.0.1]: " NETFACE
    NETFACE=${NETFACE:-172.17.0.1}
    echo $NETFACE

    ##PORT
    read -p "PORT TO LISTEN TO [3306]: " NETPORT
    NETPORT=${NETPORT:-3306}
    echo $NETPORT

    ##DB STORAGE
    DBPATH=$PWD/data
    read -p "Storage folder [${DBPATH}]: " dbp
    DBPATH=${dbp:-$DBPATH}
    echo $DBPATH
    mkdir -p $DBPATH

    ##DB NAME
    DBNAME=mydb1
    read -p "DB Name [${DBNAME}]: " DBNAME
    DBNAME=${DBNAME:-mydb1}
    echo $DBNAME

}


function GenerateNewConfig {
    #generate a random root password
    rootPassword=$(uuidgen);

    echo "MYSQL_ROOT_PASSWORD=$rootPassword";

    #write json config
    echo "{\"path\": \"$DBPATH\", \"host\": \"$NETFACE\", \"port\": \"$NETPORT\", \"dbName\": \"$DBNAME\", \"rootPassword\": \"$rootPassword\"}" > config.json;

    #write cli helper
    echo "docker exec -it mysql80_$DBNAME mysql --host=$NETFACE --port=$NETPORT --user=root --password=$rootPassword" > mysql-docker-cli.sh;
    chmod +x mysql-docker-cli.sh;

    #write backup helper
    echo "docker exec mysql80_$DBNAME /usr/bin/mysqldump --no-tablespaces --user=root --password=$rootPassword $DBNAME > backup.sql" > backupDB.sh;
    chmod +x backupDB.sh;

    #write restore from dump helper
    echo "read -p 'WARNING: Do you really want to overwrite the DB with the content of db.sql? (y/n)' -n 1 -r" > restoreDB-Dump.sh
    echo "echo # (optional) move to a new line" >> restoreDB-Dump.sh
    echo "if [[ \$REPLY =~ ^[Yy]$ ]]" >> restoreDB-Dump.sh
    echo "then" >> restoreDB-Dump.sh
    echo "  docker exec -i mysql80_$DBNAME /usr/bin/mysql --user=root --password=$rootPassword -e \"DROP DATABASE $DBNAME;\"" >> restoreDB-Dump.sh
    echo "  docker exec -i mysql80_$DBNAME /usr/bin/mysql --user=root --password=$rootPassword -e \"CREATE DATABASE $DBNAME;\"" >> restoreDB-Dump.sh
    echo "  cat ../db.sql | docker exec -i mysql80_$DBNAME /usr/bin/mysql --user=root --password=$rootPassword $DBNAME" >> restoreDB-Dump.sh
    echo "fi" >> restoreDB-Dump.sh
    chmod +x restoreDB-Dump.sh;

    #write restore from backup helper
    rm -rf restoreDB-Backup.sh
    echo "read -p 'WARNING: Do you really want to overwrite the DB with the content of backup.sql? (y/n)' -n 1 -r" > restoreDB-Backup.sh
    echo "echo # (optional) move to a new line" >> restoreDB-Backup.sh
    echo "if [[ \$REPLY =~ ^[Yy]$ ]]" >> restoreDB-Backup.sh
    echo "then" >> restoreDB-Backup.sh
    echo "  docker exec -i mysql80_$DBNAME /usr/bin/mysql --user=root --password=$rootPassword -e \"DROP DATABASE $DBNAME;\"" >> restoreDB-Dump.sh
    echo "  docker exec -i mysql80_$DBNAME /usr/bin/mysql --user=root --password=$rootPassword -e \"CREATE DATABASE $DBNAME;\"" >> restoreDB-Dump.sh
    echo "  cat backup.sql | docker exec -i mysql80_$DBNAME /usr/bin/mysql --user=root --password=$rootPassword $DBNAME" >> restoreDB-Backup.sh
    echo "fi" >> restoreDB-Backup.sh
    chmod +x restoreDB-Backup.sh;

    #write remove db container
    rm -rf deleteDB-container.sh
    echo "read -p 'WARNING: Do you really want to delete the DB and container? (y/n)' -n 1 -r" > deleteDB-container.sh
    echo "echo # (optional) move to a new line" >> deleteDB-container.sh
    echo "if [[ \$REPLY =~ ^[Yy]$ ]]" >> deleteDB-container.sh
    echo "then" >> deleteDB-container.sh
    echo "docker stop mysql80_$DBNAME" >> deleteDB-container.sh
    echo "docker rm mysql80_$DBNAME" >> deleteDB-container.sh
    echo "rm backupDB.sh;" >> deleteDB-container.sh
    echo "rm restoreDB-Dump.sh;" >> deleteDB-container.sh
    echo "rm restoreDB-Backup.sh;" >> deleteDB-container.sh
    echo "rm deleteDB-container.sh;" >> deleteDB-container.sh
    echo "rm mysql-docker-cli.sh;" >> deleteDB-container.sh
    echo "fi" >> deleteDB-container.sh
    chmod +x deleteDB-container.sh;
}

function startContainer {
    echo "";
    echo "Starting new mysql80_$DBNAME container"

    docker run --restart unless-stopped -d --name=mysql80_$DBNAME \
    --publish $NETFACE:$NETPORT:3306 \
    -e MYSQL_ROOT_PASSWORD=$rootPassword \
    -e MYSQL_ROOT_HOST=172.17.0.1 \
    -v $DBPATH:/var/lib/mysql \
    -d mysql/mysql-server:8.0 --default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

    sleep 5;
    docker logs mysql80_$DBNAME;

    ##Create the DB
    docker exec -i mysql80_$DBNAME /usr/bin/mysql --user=root --password=$rootPassword -e \"CREATE DATABASE $DBNAME;
}


function emptydir {
  ! { ls -1qA "/$1/" | grep -q . ; }
}


function InstallOrCleanDocker {
    #INSTALL DOCKER or clean previous container
    if [ -x "$(command -v docker)" ]; then
        echo "";
        echo "Cleaning previous mysql80 container ... Please wait ...";
        docker stop mysql80_$DBNAME
        docker rm mysql80_$DBNAME
    else
        echo "";
        echo "Installing docker ...";
        apt install docker.io -y;
    fi
}


main "$@"; exit