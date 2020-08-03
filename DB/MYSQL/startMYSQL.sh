
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
}


function GenerateNewConfig {
    #generate a random root password
    rootPassword=$(uuidgen);

    echo "MYSQL_ROOT_PASSWORD=$rootPassword";

    #write json config
    echo "{\"path\": \"$DBPATH\", \"host\": \"$NETFACE\", \"port\": \"$NETPORT\", \"rootPassword\": \"$rootPassword\"}" > config.json;

    #write cli helper
    echo "docker exec -it mysql80 mysql --host=$NETFACE --port=$NETPORT --user=root --password=$rootPassword" > mysql-docker-cli.sh;
    chmod +x mysql-docker-cli.sh;
}

function startContainer {
    echo "";
    echo "Starting new mysql80 container"

    docker run --name=mysql80 \
    --publish $NETFACE:3306:$NETPORT \
    -e MYSQL_ROOT_PASSWORD=$rootPassword \
    -e MYSQL_ROOT_HOST=172.17.0.1 \
    -v $DBPATH:/var/lib/mysql \
    -d mysql/mysql-server:8.0 --default-authentication-plugin=mysql_native_password --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci

    sleep 3;
    docker logs mysql80;

    echo "";
    echo "You can now connect to the mysql cli like this: ./mysql-docker-cli.sh";
}


function emptydir {
  ! { ls -1qA "/$1/" | grep -q . ; }
}


function InstallOrCleanDocker {
    #INSTALL DOCKER or clean previous container
    if [ -x "$(command -v docker)" ]; then
        echo "";
        echo "Cleaning previous mysql80 container ... Please wait ...";
        docker stop mysql80
        docker rm mysql80
    else
        echo "";
        echo "Installing docker ...";
        apt install docker.io -y;
    fi
}


main "$@"; exit