if ! command -v node &> /dev/null
then
    echo "node is required to build, try: apt install nodejs"
    exit
fi

if ! command -v pkg &> /dev/null
then
    echo "Installing PKG"
    npm install -g pkg
fi

rm -rf /tmp/cloudgatebin/
mkdir -p /tmp/cloudgatebin/
cp -r * /tmp/cloudgatebin/
rm -rf /tmp/cloudgatebin/DB/
rm -rf /tmp/cloudgatebin/binaries/
rm -rf /tmp/cloudgatebin/benchmarks/
rm -rf /tmp/cloudgatebin/apps/CatchAll/CERTS/
rm -rf /tmp/cloudgatebin/node_modules/uWebSockets.js/*.node

rm -rf ./binaries
mkdir -p ./binaries;
cd ./binaries;

#package cloudgate as binaries for win/osx/linux
#pkg /tmp/cloudgatebin/ --options max_old_space_size=4096 --targets node14-linux-x64,node14-win-x64,node14-macos-x64;
pkg /tmp/cloudgatebin/ --options max_old_space_size=4096 --targets node14-linux-x64;

#Copy uWS binaries for Node 14
cp ../node_modules/uWebSockets.js/uws_win32_x64_83.node .
#cp ../node_modules/uWebSockets.js/uws_darwin_x64_83.node .
#cp ../node_modules/uWebSockets.js/uws_linux_x64_83.node .

#create tar.gz
tar -czvf cloudgate-linux.tar.gz cloudgate-linux uws_linux_x64_83.node
