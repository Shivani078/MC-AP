import React, { createContext, useContext, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Replace this with your real authentication logic
    const [user, setUser] = useState(null);

    // Example: setUser({ uid: "EFFRFWgskjZGgF0RS7Eaqg2dxXA3", ... })
    return (
        <AuthContext.Provider value={{ user, setUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);