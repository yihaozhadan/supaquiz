import argon2 from 'argon2';
import readline from 'readline';

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout
});

rl.question('Enter password to hash: ', async (password) => {
	try {
		const hash = await argon2.hash(password, {
			type: argon2.argon2id,
			memoryCost: 65536,
			timeCost: 3,
			parallelism: 4
		});
		// Base64 encode to avoid shell variable expansion issues
		const base64Hash = Buffer.from(hash).toString('base64');
		console.log('\nGenerated Argon2id hash (base64 encoded):');
		console.log(base64Hash);
		console.log('\nOriginal hash (for reference):');
		console.log(hash);
		console.log('\nCopy the base64 encoded value to your .env file as ADMIN_PASS_HASH');
	} catch (error) {
		console.error('Error generating hash:', error);
	} finally {
		rl.close();
	}
});
