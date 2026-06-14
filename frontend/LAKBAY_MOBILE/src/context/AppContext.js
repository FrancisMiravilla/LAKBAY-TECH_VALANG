import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

export function AppProvider({ children }) {
  const [user, setUser] = useState({ name: 'Francis', isLoggedIn: true });
  const [favorites, setFavorites] = useState([]);
  const [bookings, setBookings] = useState([]);

  const toggleFavorite = (destinationId) => {
    setFavorites((prevFavorites) => {
      if (prevFavorites.includes(destinationId)) {
        return prevFavorites.filter((id) => id !== destinationId);
      } else {
        return [...prevFavorites, destinationId];
      }
    });
  };

  const addBooking = (booking) => {
    setBookings((prevBookings) => [...prevBookings, booking]);
  };

  return (
    <AppContext.Provider value={{
      user,
      setUser,
      favorites,
      toggleFavorite,
      bookings,
      addBooking
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
