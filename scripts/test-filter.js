function testLogic() {
    const email = "hannover,.duitsland@accor.com";
    const emailLocal = email.split('@')[0].toLowerCase(); // "hannover,.duitsland"

    // The exact logic from campaign-runner.js v3.3.0
    const badWords = ['general', 'info', 'contact', 'manager', 'sales', 'marketing', 'hotel', 'reservations', 'reservatie', 'receptie', 'booking', 'frontdesk', 'guest', 'hannover', 'hamburg', 'berlin', 'paris', 'amsterdam', 'bruxelles', 'munchen', 'frankfurt', 'vienna'];

    let isGeneric = false;
    let blockReason = "";

    const localParts = emailLocal.split(/[\.\,\-\_]/);
    console.log("Local Parts:", localParts);

    if (badWords.some(word => localParts.includes(word))) {
        isGeneric = true;
        blockReason = "Generiek adres (Hotel/Stad gedetecteerd)";
    }

    if (emailLocal.includes(',') || emailLocal.includes('--')) {
        isGeneric = true;
        blockReason = "Lijstvervuiling (ongeldige tekens)";
    }

    console.log("Is Generic:", isGeneric);
    console.log("Block Reason:", blockReason);
}

testLogic();
