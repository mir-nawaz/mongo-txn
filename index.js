// Boilerplate: connect to DB
const { MongoClient } = require('mongodb');
const uri = 'mongodb://localhost:27017/txn';
let client = null;

let db = null;

// The actual transfer logic
async function transfer(from, to, amount) {
  const session = client.startSession();
  session.startTransaction();
  try {
    const opts = { session, returnOriginal: false };
    const A = await db.collection('Account').
    findOneAndUpdate({ name: from }, { $inc: { balance: -amount } }, opts).
    then(res => res.value);
    if (A.balance < 0) {
      // If A would have negative balance, fail and abort the transaction
      // `session.abortTransaction()` will undo the above `findOneAndUpdate()`
      throw new Error('Insufficient funds: ' + (A.balance + amount));
    }
    
    const B = await db.collection('Account').
    findOneAndUpdate({ name: to }, { $inc: { balance: amount } }, opts).
    then(res => res.value);
    
    await session.commitTransaction();
    session.endSession();
    return { from: A, to: B };
  } catch (error) {
    // If an error occurred, abort the whole transaction and
    // undo any changes that might have happened
    await session.abortTransaction();
    session.endSession();
    throw error; // Rethrow so calling function sees error
  }
}

async function main(){
  
  client = await MongoClient.connect(uri, { useNewUrlParser: true, replicaSet: 'rs' });;
  db = client.db();

  await transfer('A', 'B', 0); // Success
  
  try {
    // Fails because then A would have a negative balance
    await transfer('A', 'B', 2);
  } catch (error) {
    console.log('---- throw')
    console.error(error); // "Insufficient funds: 1"
  }

  try {
    await Promise.all([
      transfer('A', 'B', 4),
      transfer('A', 'B', 2)
    ]);
  } catch (error) {
    console.log('--- write conflict');
    console.log(error); // "MongoError: WriteConflict"
  }
  
}

main();