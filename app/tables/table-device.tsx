import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Text,
  Flex,
  Button,
  Select,
  SelectItem,
  NumberInput,
  TextInput,
  DatePicker,
  Callout
} from '@tremor/react';
import { webUser } from '../../lib/webusers-model';
import { User } from '../../lib/users-schema';
import { Device } from '../../lib/devices-schema';
import { useEffect, useRef, useState } from 'react';
import Modal from 'react-modal';
import { FryToken } from '../../lib/tokens-schema';
import { TimeInput } from '@nextui-org/date-input';
import { Time } from '@internationalized/date';
import { getSession, useSession } from 'next-auth/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';

export default function DevicesTable({
  devices,
  tokens
}: {
  devices: Device[];
  tokens: FryToken[];
}) {
  const [updateSuccess, setUpdateSuccess] = useState('');
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showUnstakeModal, setShowUnstakeModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<Device | undefined>(
    undefined
  );

  const stakeTerms = ['Verification', 'Registration', 'Node'];
  const [stakeTermsValue, setStakeTermsValue] = useState('Verification');
  const [assetId, setAssetId] = useState(tokens[0].asset_id ?? '');
  const [stakeType, setStakeType] = useState('one');
  const [stakeAmount, setStakeAmount] = useState(1);
  const [txId, setTxId] = useState('');
  const [stakeDate, setStakeDate] = useState(new Date(Date.now()));
  const { data: session } = useSession();

  const isNodeDevice = (device: Device) => {
    return device.name.includes('Node');
  };

  const isRegistrationStaked = (device: Device) => {
    return device.registration && device.registration.amount > 0;
  };

  const isNodeStaked = (device: Device) => {
    return device.node && device.node.amount > 0;
  };

  //Reset values for Stake Modal
  useEffect(() => {
    if (showRefundModal) {
      return;
    }

    setStakeTermsValue('Verification');
    setStakeType('one');
    setStakeAmount(1);
    setTxId('');
  }, [showVerifyModal, showUnstakeModal]);

  function formatDate(dateStr: string) {
    const date = new Date(dateStr);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0'); // January is 0
    let year = date.getFullYear();
    let hours = date.getHours().toString().padStart(2, '0');
    let minutes = date.getMinutes().toString().padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  const handleStake = async () => {
    const modifyDevice = { ...selectedDevice };
    let saveData: any = {};

    switch (stakeTermsValue) {
      case 'Verification':
        {
          saveData.action = 'verification';
          saveData.stake_type = stakeType;
        }
        break;
      case 'Registration':
        {
          saveData.action = 'registration';
        }
        break;
      case 'Node':
        {
          saveData.action = 'node';
        }
        break;
    }

    saveData.miner_key = modifyDevice.miner_key;
    saveData.amount = stakeAmount;
    saveData.asset_id = assetId;
    saveData.txId = txId;

    const response = await fetch('api/stake-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saveData)
    });

    if (!response.ok) {
      console.log('Failed to update data');
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
    } else {
      setUpdateSuccess('Update success');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      console.log('Success to update data');
    }
  };

  const handleUnstake = async () => {
    const modifyDevice = { ...selectedDevice };
    let saveData: any = {};

    switch (stakeTermsValue) {
      case 'Verification':
        {
          saveData.action = 'verification';
        }
        break;
      case 'Registration':
        {
          saveData.action = 'registration';
        }
        break;
      case 'Node':
        {
          saveData.action = 'node';
        }
        break;
    }

    saveData.miner_key = modifyDevice.miner_key;

    const response = await fetch('api/unstake-device', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saveData)
    });

    if (!response.ok) {
      console.log('Failed to update data');
      setUpdateSuccess('error');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
    } else {
      setUpdateSuccess('Update success');
      setTimeout(() => {
        setUpdateSuccess('');
      }, 3_000);
      console.log('Success to update data');
    }
  };

  return (
    <div>
      {updateSuccess != '' && updateSuccess != 'error' && (
        <Callout
          className="mt-4"
          title="Success"
          icon={CheckCircleIcon}
          color="teal"
        >
          Successfully {updateSuccess} !
        </Callout>
      )}
      {updateSuccess == 'error' && (
        <Callout
          className="mt-4"
          title="Error"
          icon={CheckCircleIcon}
          color="red"
        >
          Error occured during action!
        </Callout>
      )}
      <Table>
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Miner Key / Byod</TableHeaderCell>
            <TableHeaderCell>Infos</TableHeaderCell>
            <TableHeaderCell>Added on </TableHeaderCell>
            <TableHeaderCell>Order</TableHeaderCell>
            <TableHeaderCell>Email</TableHeaderCell>
            {session &&
              session.user &&
              (session.user.owner || session.user.mods) && (
                <TableHeaderCell>Action</TableHeaderCell>
              )}
          </TableRow>
        </TableHead>
        <TableBody>
          {devices.map((device) => (
            <TableRow key={device.id}>
              <TableCell>{device.name}</TableCell>
              <TableCell>
                <Flex
                  flexDirection="col"
                  justifyContent="start"
                  alignItems="start"
                >
                  <Text>Key: {device.miner_key}</Text>
                  <Text>Byod: {device.byod ?? 'No'}</Text>
                </Flex>
              </TableCell>
              <TableCell>
                <Flex
                  flexDirection="col"
                  justifyContent="start"
                  alignItems="start"
                >
                  <Text>Registered: {device.is_registered ? 'Yes' : 'No'}</Text>
                  <Text>Verified: {device.verified ? 'Yes' : 'No'}</Text>
                  {isNodeDevice(device) && (
                    <>
                      <Text>
                        Registration:{' '}
                        {isRegistrationStaked(device) ? 'Yes' : 'No'}
                      </Text>
                      <Text>
                        Verified: {isNodeStaked(device) ? 'Yes' : 'No'}
                      </Text>
                    </>
                  )}
                </Flex>
              </TableCell>
              <TableCell>
                <Text>
                  {device.created_at
                    ? formatDate(device.created_at)
                    : 'Unknown'}
                </Text>
              </TableCell>
              <TableCell>
                <Text>{device.order}</Text>
              </TableCell>
              <TableCell>
                <Text>{device.email}</Text>
              </TableCell>
              {session &&
                session.user &&
                (session.user.owner || session.user.mods) && (
                  <TableCell>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowVerifyModal(true);
                      }}
                    >
                      Stake
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-yellow-700 border-yellow-700 hover:bg-yellow-50 hover:text-yellow-700 ml-1"
                      onClick={() => {
                        setSelectedDevice(device);
                        setShowUnstakeModal(true);
                      }}
                    >
                      Unstake
                    </Button>
                    <Button
                      variant="secondary"
                      className="text-red-700 border-red-700 hover:bg-red-50 hover:text-red-700 ml-1"
                      onClick={() => {}}
                    >
                      Refund
                    </Button>
                  </TableCell>
                )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {selectedDevice !== undefined && (
        <>
          <Modal
            isOpen={showVerifyModal}
            closeTimeoutMS={500}
            style={customStyles}
            contentLabel="Delete Reduction"
          >
            <Flex flexDirection="col" className="gap-2 w-full">
              <h2>
                <strong>Stake Device</strong>
              </h2>
              <div className="w-full">
                <label>Stake Terms:</label>
                <Select
                  defaultValue={stakeTermsValue}
                  onValueChange={(value) => {
                    setStakeTermsValue(value);
                  }}
                >
                  {stakeTerms.map((value, index) => {
                    return (
                      <SelectItem key={index + 1} value={value}>
                        {value}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
              {stakeTermsValue === 'Verification' && (
                <div className="w-full">
                  <label>Stake Type:</label>
                  <Select
                    defaultValue={stakeType}
                    onValueChange={(value) => setStakeType(value)}
                  >
                    <SelectItem key={0} value="one">
                      One
                    </SelectItem>
                    <SelectItem key={1} value="two">
                      Two
                    </SelectItem>
                  </Select>
                </div>
              )}
              {tokens && (
                <div className="w-full">
                  <label>Stake Token:</label>
                  <Select
                    defaultValue={assetId}
                    onValueChange={(value) => {
                      console.log(value);
                      setAssetId(value);
                    }}
                  >
                    {tokens.map((value, index) => {
                      return (
                        <SelectItem key={index + 1} value={value.asset_id}>
                          {value.name}
                        </SelectItem>
                      );
                    })}
                  </Select>
                </div>
              )}
              <div className="w-full">
                <label>Staking Amount:</label>
                <NumberInput
                  step={1}
                  defaultValue={1}
                  value={stakeAmount}
                  min={1}
                  onValueChange={(value) => setStakeAmount(value)}
                  placeholder="Please input stake amount"
                />
              </div>
              <div className="w-full">
                <label>TxId:</label>
                <TextInput
                  type="text"
                  placeholder="Please input transaction id"
                  value={txId}
                  onValueChange={(value) => setTxId(value)}
                />
              </div>
              <div>
                <Flex className="gap-2">
                  <Button
                    onClick={() => {
                      setShowVerifyModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleStake()}>Stake</Button>
                </Flex>
              </div>
            </Flex>
          </Modal>
          <Modal
            isOpen={showUnstakeModal}
            closeTimeoutMS={500}
            style={customStyles}
            contentLabel="Delete Reduction"
          >
            <Flex flexDirection="col" className="gap-2 w-full">
              <h2>
                <strong>Stake Device</strong>
              </h2>
              <div className="w-full">
                <label>Stake Terms:</label>
                <Select
                  defaultValue={stakeTermsValue}
                  onValueChange={(value) => {
                    setStakeTermsValue(value);
                  }}
                >
                  {stakeTerms.map((value, index) => {
                    return (
                      <SelectItem key={index + 1} value={value}>
                        {value}
                      </SelectItem>
                    );
                  })}
                </Select>
              </div>
              <div>
                <Flex className="gap-2">
                  <Button
                    onClick={() => {
                      setShowUnstakeModal(false);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={() => handleStake()}>Unstake</Button>
                </Flex>
              </div>
            </Flex>
          </Modal>
        </>
      )}
    </div>
  );
}

const customStyles = {
  content: {
    top: '50%',
    left: '50%',
    right: 'auto',
    bottom: 'auto',
    marginRight: '-50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'white', // Example background color
    color: '#6b7280',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 4px 8px 0 rgba(0,0,0,0.2)',
    minWidth: '320px'
  },
  overlay: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)' // Example overlay color
  }
};
