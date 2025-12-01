import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosClient from '../axios';
import '../styles/loginstyle.css';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await axiosClient.post('/login', {
        email: formData.email,
        password: formData.password
      });

      // Example: save user to localStorage (or better: use context/store)
      const { user /*, token */ } = res.data;
      localStorage.setItem('user', JSON.stringify(user));
      // if (res.data.token) localStorage.setItem('token', res.data.token);

      // navigate to dashboard
      navigate('/Dashboard');
    } catch (err) {
      // axios error handling
      if (err.response) {
        setError(err.response.data.message || 'Login failed');
      } else {
        setError('Network error');
      }
      console.error(err);
    }
  };

  return (
    <div className="login-container">
      <div className="login-left">
        <div className="login-form-wrapper">
          <h2 className="login-title">Welcome Back!</h2>
          <form onSubmit={handleSubmit} className="login-form">
            {error && <div className="error">{error}</div>}
            <div className="form-group">
              <label htmlFor="email">Branch Name</label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="Enter Branch Name..."
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                placeholder="Enter your Password..."
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                required
              />
            </div>

            <button type="submit" className="login-button">Log In</button>
          </form>
        </div>
      </div>

      <div className="login-right">
        <img src="/pictures/Papa(1).png" alt="Signup" />
      </div>
    </div>
  );
}
