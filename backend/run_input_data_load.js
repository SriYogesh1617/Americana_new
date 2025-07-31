// Load the InputDataController module
const { runDataLoad } = require('./controllers/InputDataController');

// Simply call the function that's already defined in your code
runDataLoad()
    .then(() => {
        console.log('✅ Data loading completed!');
    })
    .catch((error) => {
        console.error('❌ Error:', error);
    });