import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

interface AuthContextType {
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
    token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = import.meta.env.VITE_API_URL;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [token, setToken] = useState<string | null>(null);

    useEffect(() => {
        // Check if token exists in localStorage on mount
        const storedToken = localStorage.getItem('admin_token');
        if (storedToken) {
            setToken(storedToken);
            setIsAuthenticated(true);
        }
    }, []);

    const login = async (username: string, password: string) => {
        try {
            const response = await axios.post(`${API_URL}/api/admin/login`, {
                username,
                password,
            });
            const { access_token } = response.data;
            localStorage.setItem('admin_token', access_token);
            setToken(access_token);
            setIsAuthenticated(true);
        } catch {
            throw new Error('Invalid username or password');
        }
    };

    const logout = () => {
        localStorage.removeItem('admin_token');
        setToken(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, login, logout, token }}>
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};