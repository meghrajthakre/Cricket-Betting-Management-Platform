import { useState } from "react";
import Modal from "../../shared/components/Modal";
import CreateUser from "./CreateUser";
import UsersList from "./UsersList";

export default function CreateUserPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = () => {
    setRefreshKey((value) => value + 1);
  };

  return (
    <>
      <UsersList
        refreshKey={refreshKey}
        onGoCreate={() => setCreateOpen(true)}
      />
      <Modal
        open={createOpen}
        title="Create User"
        onClose={() => setCreateOpen(false)}
      >
        <CreateUser
          onCancel={() => setCreateOpen(false)}
          onSuccess={handleCreated}
        />
      </Modal>
    </>
  );
}
