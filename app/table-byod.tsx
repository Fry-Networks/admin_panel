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
  const [licenseUsedStatus, setLicenseUsedStatus] = useState<{ [key: string]: boolean }>({});

  const setUsed = async (license: { license: string, used: boolean }, email: string, index: number) => {
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
      setLicenseUsedStatus(prev => ({ ...prev, [`${email}-${index}`]: result.used }));
      return result.used;
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

                  const licenseKey = `${byod.email}-${index}`;
                  let color: "red"|"green" = licenseUsedStatus[licenseKey] ? "red" : "green";
                  // Directly using <div> here
                  return (<div key={index}>
                    {license_data.license}
                    <Button
                      color={color}
                      style={{ marginTop: "2px", marginLeft: "2px" }}
                      onClick={() => {
                        setUsed(license_data, byod.email, index).then((used) => {
                          color = used ? "red" : "green";
                        });
                      }}>
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
