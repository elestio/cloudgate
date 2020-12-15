echo "";
echo "Installing Cloudgate as a service with SystemD ..."

##TCP PORT (default to port 80)
uPort=80

##Threads/Cores (default: all cores available)
nbCores=$(grep -c processor /proc/cpuinfo)

##APP_ROOT (default: /var/www/cloudgate/)
APP_ROOT=/var/www/cloudgate

#Run AS (default: the current user)
userName=$USER;

domain=$1; #first param is the domain name authorized as sender in postfix (generate the DKIM for the domain)

echo "";
echo "Install dependencies: ...";
echo "";

## INSTALL NODE 14.X if needed
if which node > /dev/null
then
    echo -e "\033[32mInstalled Node.js version: $(node -v)\033[m";
else
    echo -e "\033[1mInstalling Node.js 14.x ...\033[m";
    sudo apt-get -qq -y install curl &> /dev/null;
    curl -sL https://deb.nodesource.com/setup_14.x | sudo -E bash - &> /dev/null;
    sudo apt install -qq -y nodejs &> /dev/null;
    echo -e "\033[32mInstalled Node.js version: $(node -v)\033[m";
fi

## INSTALL NPM if needed
if which npm > /dev/null
then
    echo -e "\033[32mInstalled NPM version: $(npm -v)\033[m";
else
    echo -e "\033[1mInstalling NPM ...\033[m";
    sudo apt install -qq -y npm  &> /dev/null;
    echo -e "\033[32mInstalled NPM version: $(npm -v)\033[m";
fi

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
sed -i "s#/var/www/cloudgate/#${APP_ROOT}/#g" /etc/cloudgate/memorystate.json
sed -i "s#12##g" /etc/cloudgate/memorystate.json #fill with empty, so it's dynamic


sed -i 's#"SSL": ""#"SSL": "1"#g' /etc/cloudgate/memorystate.json
sed -i "s#\"SSL_DOMAIN\": \"\"#\"SSL_DOMAIN\": \"${domain}\"#g" /etc/cloudgate/memorystate.json

echo "OK";
echo "";

#MySQL Docker
mkdir -p $APP_ROOT/DB/MYSQL
wget -O $APP_ROOT/DB/MYSQL/startMYSQL_unattended.sh https://raw.githubusercontent.com/elestio/cloudgate/master/DB/MYSQL/startMYSQL_unattended.sh?v=2

#SMTP Docker
mkdir -p $APP_ROOT/SMTP
wget -O $APP_ROOT/SMTP/startPostfix.sh https://raw.githubusercontent.com/elestio/cloudgate/master/SMTP/startPostfix.sh $domain


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
wget -O $APP_ROOT/default/public/index.html https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/index.html
wget -O $APP_ROOT/default/public/css/main.css https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/css/main.css
wget -O $APP_ROOT/default/public/wsChat.html https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/wsChat.html
wget -O $APP_ROOT/default/public/wsDemo.html https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/wsDemo.html
wget -O $APP_ROOT/default/public/wsAdmin.html https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/wsAdmin.html
wget -O $APP_ROOT/default/public/wsEcho.html https://raw.githubusercontent.com/elestio/cloudgate/master/apps/CatchAll/public/wsEcho.html

systemctl enable cloudgate
systemctl daemon-reload
systemctl start cloudgate

echo "You can edit cloudgate config here: /etc/cloudgate/memorystate.json";
echo "To start/stop cloudgate service with: 'systemctl start cloudgate' and 'systemctl stop cloudgate'";
echo "To check logs: journalctl -u cloudgate"
echo "";
echo "Your root app folder is: ${APP_ROOT}/";
echo "";
echo "You can now create apps with: cloudgate --create /path/of/your/app";
echo "and then load the app with: cloudgate --load /path/of/your/app";