// Test email array transformation
const emailString = 'stephen@tonkaintl.com,gary@tonkaintl.com';
const emailArray = emailString.split(',').map(e => e.trim());

console.log('Input string:', emailString);
console.log('Output array:', emailArray);
console.log('Array.isArray check:', Array.isArray(emailArray));

// Simulate what the email service does now
const toRecipients = Array.isArray(emailArray)
  ? emailArray.map(email => ({
      emailAddress: {
        address: email,
      },
    }))
  : [
      {
        emailAddress: {
          address: emailArray,
        },
      },
    ];

console.log('\ntoRecipients structure:');
console.log(JSON.stringify(toRecipients, null, 2));
