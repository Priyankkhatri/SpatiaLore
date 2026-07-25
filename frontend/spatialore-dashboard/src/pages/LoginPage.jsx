import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        setErrorMessage(error.message || 'Invalid login credentials');
      } else {
        navigate('/');
      }
    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>SpatiaLore Admin</h2>
          <p>Sign in to manage audio tours and POIs</p>
        </div>

        {errorMessage && (
          <div className="error-banner">
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="admin@spatialore.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn-primary btn-block" disabled={loading}>
            {loading ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
