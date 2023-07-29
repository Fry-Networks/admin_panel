import { SearchSelect, SearchSelectItem, Text } from "@tremor/react";
import { getSession } from "next-auth/react";
import { useState } from "react";
import clientPromise from "../../lib/mongoclient";
import { User } from "../../lib/users-schema";
export default function DeviceForm({ users }: { users: User[] }) {
    const [deviceType, setDeviceType] = useState("");
    const [selectedUser, setSelectedUser] = useState("");
    return (
        <div>
            <Text className="mb-4">Select a device type and a user, click submit to generate a key and send it via email to the user</Text>
            <SearchSelect className="mb-4" placeholder="Select a device type..." style={{ marginLeft: "20px" }} onValueChange={(value) => setDeviceType(value)} value={deviceType}>
                <SearchSelectItem value="VPN">VPN</SearchSelectItem>
                <SearchSelectItem value="OGPS">OGPS</SearchSelectItem>
                <SearchSelectItem value="IGPS">IGPS</SearchSelectItem>
                <SearchSelectItem value="IDB">IDB</SearchSelectItem>
                <SearchSelectItem value="ODB">ODB</SearchSelectItem>
            </SearchSelect>

            {deviceType ? (
                <SearchSelect placeholder="Select a user" style={{ marginLeft: "20px" }} onValueChange={(value) => setSelectedUser(value)} value={selectedUser}>
                    {users.map((user) => (
                        <SearchSelectItem key={user._id} value={user._id}>
                             {user.name?.full ? `${user.name?.full} (${user.email})` : user.email}
                             </SearchSelectItem>
                    ))}
                </SearchSelect>
            ) : ""}
        </div>

    );
};