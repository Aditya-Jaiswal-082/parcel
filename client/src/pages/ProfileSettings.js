import React, { useEffect, useState } from "react";
import axios from "axios";
import "./ProfileSettings.css";

export default function ProfileSettings() {
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [password, setPassword] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  
  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Unauthorized");
      const { data } = await axios.get(
        "http://localhost:5000/api/user/me",
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfile({ name: data.name, email: data.email });
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Failed to load profile." });
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaveLoading(true);
    setMessage({ type: "", text: "" });
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Unauthorized");
      await axios.patch(
        "http://localhost:5000/api/user/me",
        { 
          name: profile.name, 
          email: profile.email, 
          ...(password ? { password } : {}) 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: "success", text: "Profile updated successfully." });
      setEditMode(false);
      setPassword("");
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.error || "Update failed." });
    } finally {
      setSaveLoading(false);
    }
  }

  function handleChange(e) {
    setProfile(p => ({ ...p, [e.target.name]: e.target.value }));
  }

  return (
    <div className="profile-settings">
      <h2>👤 Profile Settings</h2>
      {loading ? (
        <div className="info-msg">Loading profile...</div>
      ) : (
        <form className="profile-form" onSubmit={handleSave}>
          <label>
            Name:
            <input
              type="text"
              name="name"
              value={profile.name}
              disabled={!editMode}
              onChange={handleChange}
              autoComplete="name"
            />
          </label>
          <label>
            Email:
            <input
              type="email"
              name="email"
              value={profile.email}
              disabled={!editMode}
              onChange={handleChange}
              autoComplete="email"
            />
          </label>
          {editMode && (
            <label title="Leave blank to keep current password">
              New Password:
              <input
                type="password"
                name="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Leave blank to not change"
              />
            </label>
          )}
          <div className="profile-actions">
            {!editMode ? (
              <button
                type="button"
                className="primary-btn"
                onClick={() => setEditMode(true)}
              >
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={saveLoading}
                >
                  {saveLoading ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setEditMode(false);
                    setPassword("");
                    loadProfile();
                  }}
                  disabled={saveLoading}
                >
                  Cancel
                </button>
              </>
            )}
          </div>
          {message.text && (
            <div className={message.type === "error" ? "profile-msg error" : "profile-msg success"}>
              {message.text}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
