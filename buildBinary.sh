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

rm -rf /tmp/cloudgate/
mkdir -p /tmp/cloudgate/
cp -r * /tmp/cloudgate/
rm -rf /tmp/cloudgate/DB/
rm -rf /tmp/cloudgate/binaries/
rm -rf /tmp/cloudgate/benchmarks/
rm -rf /tmp/cloudgate/apps/maxsens/
rm -rf /tmp/cloudgate/apps/CatchAll/CERTS/
rm -rf /tmp/cloudgate/apps/ReverseProxy/node_modules/

rm -rf ./binaries/*
mkdir -p ./binaries;
cd ./binaries;

#package cloudgate as binaries for win/osx/linux
#pkg /tmp/cloudgate/ --options max_old_space_size=4096 --targets node14-linux-x64,node14-win-x64,node14-macos-x64;
pkg /tmp/cloudgate/ --options max_old_space_size=4096 --targets node14-linux-x64;

#Copy cloudgate binaries for Node 14
#cp ../bin/cloudgate_win32_x64_83.node .
#cp ../bin/cloudgate_darwin_x64_83.node .
cp ../bin/cloudgate_linux_x64_83.node .

#create tar.gz
#tar -czvf cloudgate-win.tar.gz cloudgate-win.exe cloudgate_win32_x64_83.node
#tar -czvf cloudgate-osx.tar.gz cloudgate-macos cloudgate_darwin_x64_83.node
tar -czvf cloudgate-linux.tar.gz cloudgate cloudgate_linux_x64_83.node