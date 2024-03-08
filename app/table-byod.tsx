import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Button,
  Callout
} from '@tremor/react';
import { webUser } from '../lib/webusers-model';
import { User } from '../lib/users-schema';
import { CheckCircleIcon } from "@heroicons/react/24/solid";
import { Device } from '../lib/devices-schema';
import { ByodUser } from '../lib/byod-schema';
import { useState } from 'react';

export default function ByodTable({ byods }: { byods: ByodUser[] }) {
  const [updateSuccess, setUpdateSuccess] = useState(""); // State to track update success
  const setUsed = async (license: {license: string, used: boolean}, email: string) => {
    try {
      const response = await fetch('/api/edit-license-use', { // Replace with your actual API endpoint
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ license, email }),
      });

      if (!response.ok) {
        setUpdateSuccess("error"); // Reset success state
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Updated license use:', result);
      setUpdateSuccess("license"); // Set success state to true
      setTimeout(() => setUpdateSuccess(""), 3000); // Reset success state after 3 seconds
    } catch (err) {
      console.error('Error updating license use:', err);
    }
  }
  return (
    <div>
      {(updateSuccess != "" && updateSuccess != "error") && (
        <Callout className="mt-4" title="Success" icon={CheckCircleIcon} color="teal">
          Successfully updated {updateSuccess} !
        </Callout>
      )}
      {(updateSuccess == "error") && (
        <Callout className="mt-4" title="Error" icon={CheckCircleIcon} color="red">
          Error updating product!
        </Callout>
      )}
      <Table>

        <TableHead>
          <TableRow>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Licenses</TableHeaderCell>
            <TableHeaderCell>Payments</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {byods.map((byod) => (
            <TableRow key={byod.id}>
              <TableCell>{byod.email}</TableCell>
              <TableCell>
                {byod.licenses.map((license_data, index) => {

                  const color = license_data.used ? "red" : "green";
                  // Directly using <div> here
                  return (<div key={index}>
                    {license_data.license}
                    <Button
                      color={color}
                      onClick={() => setUsed(license_data, byod.email)}>
                      Mark as used
                    </Button>
                  </div>
                  );

                })
                }

              </TableCell>
              <TableCell>
                {/* Assuming Text component doesn't need a component prop here */}
                <div>{`Algo: ${byod.algo ? "Yes" : "No"} | Fry: ${byod.fry ? "Yes" : "No"}`}</div>
              </TableCell>
            </TableRow>
          ))}


        </TableBody>
      </Table>
    </div>
  );
}
