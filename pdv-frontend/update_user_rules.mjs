import PocketBase from 'pocketbase';

const pb = new PocketBase('https://backpdv.darkstoresuplementos.com');

async function fixRulesFinal() {
    try {
        console.log("Logging in as system admin...");
        await pb.admins.authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');

        const collections = await pb.collections.getFullList();
        const usersCol = collections.find(c => c.name === 'users');

        if (usersCol) {
            console.log("Applying robust admin rules...");
            
            const adminRule = '@request.auth.role = "admin"';
            const selfOrAdmin = `@request.auth.role = "admin" || id = @request.auth.id`;

            await pb.collections.update(usersCol.id, {
                listRule: selfOrAdmin,
                viewRule: selfOrAdmin,
                updateRule: selfOrAdmin,
                deleteRule: adminRule,
                manageRule: adminRule // Explicitly allow admins to manage auth records
            });
            console.log("Rules updated successfully!");
        }
    } catch (err) {
        console.error("Rules update failed:", err);
    }
}

fixRulesFinal();
