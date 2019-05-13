// Boilerplate: connect to DB
const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017/txn';
let client = null;

let db = null;


async function main(){
  
  client = await MongoClient.connect(uri, { useNewUrlParser: true, replicaSet: 'rs' });;
  db = client.db();

  let test = await transaction(this, transfer, ['A', 'B', 0]);
  console.log('response --> ', test);
  
  try {
    // Fails because then A would have a negative balance
    await transaction(this, transfer, ['A', 'B', 2]);
  } catch (error) {
    console.log('---- throw')
    console.error(error); // "Insufficient funds: 1"
  }

  try {
    await Promise.all([
      transaction(this, transfer, ['A', 'B', 6]),
      transaction(this, transfer, ['A', 'B', 2])
    ]);
  } catch (error) {
    console.log('--- write conflict');
    console.log(error); // "MongoError: WriteConflict"
  }

}

async function transaction(ctx, execTrnxFunc, args){
 const session = client.startSession();
  session.startTransaction();
  try {
    const opts = { session, returnOriginal: false };
    ctx.opts = opts;
    
    let funcRes = await execTrnxFunc.apply(ctx,args);

    await session.commitTransaction();
    session.endSession();
    return funcRes;
  } catch (error) {
    // log error and throw
    //console.log('error --> ', error);
    await session.abortTransaction();
    session.endSession();
    throw error; // Rethrow so calling function sees error
  }
}

async function transfer(from, to, amount){
  const A = await db.collection('Account').
    findOneAndUpdate({ name: from }, { $inc: { balance: -amount } }, this.opts).
    then(res => res.value);

  if (A.balance < 0) {
    throw new Error('Insufficient funds: ' + (A.balance + amount));
  }
  
  const B = await db.collection('Account').
    findOneAndUpdate({ name: to }, { $inc: { balance: amount } }, this.opts).
    then(res => res.value);

  return { from: A, to: B };
}


main();