// before
db.coll.deleteMany({});
// command
db.coll.insertOne({a: 1}, {writeConcern: {w: -1}});
// command
db.coll.find();
// clear
db.coll.drop();
