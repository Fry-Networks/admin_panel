export async function addDevice({ email, id, order, byod, api_type, credentials }: { email: string, id: string, order: string, byod?: string, api_type?: string, credentials?: Record<string, string> }): Promise<boolean> {
    const res = await fetch('/api/add-device', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, id, order, byod, api_type, credentials })
    });
    return res.ok;
};

export async function addUser(data: { email: string, address: string, first_name: string, last_name: string }): Promise<boolean> {
    const res = await fetch('/api/add-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    });
    return res.ok;
}

export async function removeUser(user_id: string): Promise<boolean> {
    const res = await fetch('/api/remove-user', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id })
    });
    return res.ok;
}

export async function changeDevice(id: string, miner_key: string): Promise<boolean> {
    const res = await fetch('/api/change-device', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id, miner_key})
    });
    return res.ok;
}
