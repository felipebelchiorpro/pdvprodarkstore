import PocketBase from 'pocketbase';

const pb = new PocketBase('https://backpdv.darkstoresuplementos.com');

async function list() {
    try {
        console.log("Logging in...");
        await pb.admins.authWithPassword('contatofelipebelchior@gmail.com', '@Fe3595157');
        
        console.log("Products:");
        const products = await pb.collection('products').getFullList();
        products.forEach(p => {
            console.log(`- ${p.id}: ${p.name} (Sell: ${p.sell_price}, Cost: ${p.cost_price})`);
        });

        console.log("\nOpen Cash Registers:");
        const regs = await pb.collection('cash_register').getFullList({
            filter: 'status = "Open"'
        });
        regs.forEach(r => {
            console.log(`- ${r.id}: ${r.status} (Opened: ${r.opening_time})`);
        });

    } catch (e) {
        console.error("List failed:", e);
    }
}

list();
