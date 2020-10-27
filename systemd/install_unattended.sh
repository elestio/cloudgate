echo "";
echo "Installing Cloudgate as a service with SystemD ..."

##TCP PORT (default to port 80)
uPort=9000

##Threads/Cores (default: all cores available)
nbCores=$(grep -c processor /proc/cpuinfo)

##APP_ROOT (default: /var/www/cloudgate/)
APP_ROOT=/var/www/cloudgate/

#Run AS (default: the current user)
userName=$USER;


echo "";
echo "Download & Install cloudgate: ...";
echo "";
##npm install -g @elestio/cloudgate --ignore-scripts
wget -O - https://cloudgate.terasp.net/CDN/cloudgate.sh | bash
cgPath=/bin/cloudgate
#nodebin=$(which node)

echo "";
echo "Copying configuration: ......";
mkdir -p /etc/cloudgate/
mkdir -p $APP_ROOT
#cp cloudgate.service /etc/systemd/system/cloudgate.service
wget -O /etc/systemd/system/cloudgate.service https://raw.githubusercontent.com/elestio/cloudgate/master/systemd/cloudgate.service
sed -i "s#root#${userName}#g" /etc/systemd/system/cloudgate.service
sed -i "s#binpath#${cgPath}#g" /etc/systemd/system/cloudgate.service

#cp memorystate.template /etc/cloudgate/memorystate.json
wget -O /etc/cloudgate/memorystate.json https://raw.githubusercontent.com/elestio/cloudgate/master/systemd/memorystate.template
sed -i "s#3000#${uPort}#g" /etc/cloudgate/memorystate.json
sed -i "s#/var/www/cloudgate/#${APP_ROOT}#g" /etc/cloudgate/memorystate.json
sed -i "s#12#${nbCores}#g" /etc/cloudgate/memorystate.json
echo "OK";
echo "";

#copy default files in approot
mkdir -p $APP_ROOT/default
#cp -r ../apps/CatchAll/*  $APP_ROOT/default

mkdir -p $APP_ROOT/default/public
mkdir -p $APP_ROOT/default/public/css
mkdir -p $APP_ROOT/default/API
mkdir -p $APP_ROOT/default/API/tests
mkdir -p $APP_ROOT/default/API/websocket

wget -O $APP_ROOT/default/appconfig.json https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/appconfig.json
wget -O $APP_ROOT/default/API/tests/simple.js https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/API/tests/simple.js
wget -O $APP_ROOT/default/API/tests/full.js https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/API/tests/full.js
wget -O $APP_ROOT/default/API/websocket/Echo.js https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/API/websocket/Echo.js
wget -O $APP_ROOT/default/API/websocket/Chat.js https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/API/websocket/Chat.js
wget -O $APP_ROOT/default/index.html https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/index.html
wget -O $APP_ROOT/default/css/main.css https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/css/main.css
wget -O $APP_ROOT/default/wsChat.html https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/wsChat.html
wget -O $APP_ROOT/default/wsDemo.html https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/wsDemo.html
wget -O $APP_ROOT/default/wsAdmin.html https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/wsAdmin.html
wget -O $APP_ROOT/default/wsEcho.html https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/wsEcho.html

systemctl enable cloudgate
systemctl daemon-reload
systemctl start cloudgate

echo "You can edit cloudgate config here: /etc/cloudgate/memorystate.json";
echo "To start/stop cloudgate service with: 'systemctl start cloudgate' and 'systemctl stop cloudgate'";
echo "To check logs: journalctl -u cloudgate"
echo "";
echo "Your root app folder is: ${APP_ROOT}";
echo "";
echo "You can now create apps with: cloudgate --create /path/of/your/app";
echo "and then load the app with: cloudgate --load /path/of/your/app";