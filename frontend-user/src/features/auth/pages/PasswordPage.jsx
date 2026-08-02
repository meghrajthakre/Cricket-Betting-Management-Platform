import React, { useState } from 'react';

const Password = () => {
  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle password change logic here
    console.log('Password change requested', formData);
  };

  return (
    <div className=" bg-[var(--color-bg-main)]">
      {/* Main content – centered form card */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-2xl font-bold text-center text-[var(--color-primary)] mb-6">
            Change Password
          </h1>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Old Password */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
                OLD PASSWORD
              </label>
              <input
                type="password"
                name="oldPassword"
                value={formData.oldPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-input-bg)] text-[var(--color-text-dark)]"
              />
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
                NEW PASSWORD
              </label>
              <input
                type="password"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-input-bg)] text-[var(--color-text-dark)]"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-dark)] mb-1">
                CONFIRM PASSWORD
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-input-bg)] text-[var(--color-text-dark)]"
              />
            </div>

            {/* Done button */}
            <button
              type="submit"
              className="w-full py-3 bg-[var(--color-btn-bg)] text-white font-semibold rounded-md hover:bg-[var(--color-btn-hover)] transition duration-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            >
              Done
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Password;