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

echo "";
echo "Copying configuration: ......";
mkdir -p /etc/cloudgate/
cp cloudgate.service /etc/systemd/system/cloudgate.service
sed "s/root/${userName}/g" /etc/systemd/system/cloudgate.service &> /dev/null
cp memorystate.template /etc/cloudgate/memorystate.json
echo "OK";
echo "";

#service start cloudgate