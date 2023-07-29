

export async function addDevice({ email, device_type }: { email: string, device_type: string }): Promise<void> {
    let device_name = "";

    switch (device_type) {
        case "ODB":
            device_name = "$FRY Outdoor Decibel Miner";
            break;
        case "IDB":
            device_name = "$FRY Indoor Decibel Miner";
            break;
        case "IGPS":
            device_name = "$FRY Indoor Satellite Miner";
            break;
        case "OGPS":
            device_name = "$FRY Outdoor Satellite Miner";
            break;
        case "VPN":
            device_name = "$FRY Bandwidth Miner";
            break;
        default:
            "Unknown Device";
    }

    const res = await fetch('/api/add-device', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, device_name, device_type })
    });
    console.log(res.status);

};