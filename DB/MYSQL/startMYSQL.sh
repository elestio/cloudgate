##DB STORAGE
DBPATH=$PWD/data
read -p "Storage folder [${DBPATH}]: " DBPATH
DBPATH=${DBPATH:-$DBPATH}
echo $DBPATH
mkdir -p $DBPATH

##INTERFACE
read -p "NETWORK INTERFACE TO LISTEN TO [172.17.0.1]: " NETFACE
NETFACE=${NETFACE:-172.17.0.1}
echo $NETFACE

##PORT
read -p "PORT TO LISTEN TO [3306]: " NETPORT
NETPORT=${NETPORT:-3306}
echo $NETPORT

##DBUSER
read -p "MYSQL_USER [DBU_APPID]: " DBUSER
DBUSER=${DBUSER:-DBU_APPID}
echo $DBUSER

##DBPASSWORD
randomUUID=$(uuidgen);
read -p "MYSQL_PASSWORD [${randomUUID}]: " DBPASSWORD
DBPASSWORD=${DBPASSWORD:-${randomUUID}}
echo $DBPASSWORD

##DBUSER
read -p "MYSQL_DATABASE [MYAPP]: " MYSQL_DATABASE
MYSQL_DATABASE=${MYSQL_DATABASE:-MYAPP}
echo $MYSQL_DATABASE

if [ -x "$(command -v docker)" ]; then
    echo "Docker is already installed";
else
    echo "Installing docker ...";
    apt install docker.io -y;
fi

echo "";
echo "Cleaning previous mysql80 container";
docker stop mysql80
docker rm mysql80

echo "";
echo "Starting new mysql80 container"
docker run --name=mysql80 \
   --publish $NETFACE:3306:$NETPORT \
   -e MYSQL_USER=$DBUSER -e MYSQL_PASSWORD=$DBPASSWORD -e MYSQL_DATABASE=$MYSQL_DATABASE \
   -v $DBPATH:/var/lib/mysql \
   -d mysql/mysql-server:8.0


docker logs mysql80;

echo "DONE";

echo "";
echo "You can now connect to the mysql cli like this: ";
echo "mysql --host=$NETFACE --port=$NETPORT --user=$DBUSER --password=$DBPASSWORD $MYSQL_DATABASE";

echo "";
echo "You can also backup & restore your DB with: ";
echo "./backup.sh";
echo "and";
echo "./restore.sh";
