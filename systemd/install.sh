echo "";
echo "Installing Cloudgate as a service with SystemD ..."

#read -p "Run service as user [root]: " userName
#userName=${userName:-root}
userName=$USER;
#echo $userName

echo "";
echo "Download & Install cloudgate: ...";
echo "";
npm install -g @elestio/cloudgate --ignore-scripts
cgPath=$(which cloudgate)

echo "";
echo "Copying configuration: ......";
mkdir -p /etc/cloudgate/
cp cloudgate.service /etc/systemd/system/cloudgate.service
sed -i "s#root#${userName}#g" /etc/systemd/system/cloudgate.service
sed -i "s#binpath#${cgPath}#g" /etc/systemd/system/cloudgate.service

cp memorystate.template /etc/cloudgate/memorystate.json
echo "OK";
echo "";

systemctl enable cloudgate
systemctl start cloudgate
systemctl status cloudgate.service
