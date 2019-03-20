# Mongodb Transaction
Mongodb Sample Transaction Implementation

```
Starting in version 4.0, MongoDB provides the ability to perform multi-document transactions against replica sets.
```

# Create a replica set
```
sudo vim mongod.conf 
```
Append below 
```
replication:
  replSetName: "rs"
```
Restart mongo service
```
sudo service mongodb stop
```
initiate replica set
```
rs.status()
rs.initiate()
```

# How to Setup

## Install npm packages
```
npm install 
```

## Start server
```
npm run start
```