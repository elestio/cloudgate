echo "";
echo "Installing Cloudgate as a service with SystemD ..."

##TCP PORT
read -p "Run on port [3000]: " uPort
uPort=${uPort:-3000}
echo $uPort

##Threads/Cores
read -p "Number of cores to use [$(grep -c processor /proc/cpuinfo)]: " nbCores
nbCores=${nbCores:-$(grep -c processor /proc/cpuinfo)}
echo $nbCores

##APP_ROOT
read -p "Path to your Apps root folder [/var/www/cloudgate/]: " APP_ROOT
APP_ROOT=${APP_ROOT:-/var/www/cloudgate/}
echo $APP_ROOT

#read -p "Run service as user [root]: " userName
#userName=${userName:-root}
userName=$USER;
#echo $userName

echo "";
echo "Download & Install cloudgate: ...";
echo "";
npm install -g @elestio/cloudgate --ignore-scripts
cgPath=$(which cloudgate)
nodebin=$(which node)

echo "";
echo "Copying configuration: ......";
mkdir -p /etc/cloudgate/
mkdir -p $APP_ROOT
cp cloudgate.service /etc/systemd/system/cloudgate.service
sed -i "s#root#${userName}#g" /etc/systemd/system/cloudgate.service
sed -i "s#binpath#${cgPath}#g" /etc/systemd/system/cloudgate.service
sed -i "s#nodebin#${nodebin}#g" /etc/systemd/system/cloudgate.service

cp memorystate.template /etc/cloudgate/memorystate.json
sed -i "s#3000#${uPort}#g" /etc/cloudgate/memorystate.json
sed -i "s#/var/www/cloudgate/#${APP_ROOT}#g" /etc/cloudgate/memorystate.json
sed -i "s#12#${nbCores}#g" /etc/cloudgate/memorystate.json
echo "OK";
echo "";

#copy default files in approot
mkdir -p $APP_ROOT/default
cp -r ../apps/CatchAll/*  $APP_ROOT/default

systemctl enable cloudgate
systemctl daemon-reload
systemctl start cloudgate

echo "cloudgate is $(systemctl show -p SubState --value cloudgate)";
echo "";

echo "You can edit cloudgate config here: /etc/cloudgate/memorystate.json";
echo "To start/stop cloudgate service with: 'systemctl stop cloudgate' and 'systemctl stop cloudgate'";
echo ""
echo "Your root app folder is: ${APP_ROOT}";
