import React, { createContext, useState, useContext } from 'react';

const AppContext = createContext();

const INITIAL_NOTIFS = [
  { id: 1, type: 'scan',  icon: '📷', title: 'Welcome to Lakbay!', sub: 'Start exploring Zamboanga City today.', time: 'Just now', read: false },
];

export function AppProvider({ children }) {
  const [user, setUser] = useState({ name: 'Francis', isLoggedIn: true });
  const [favorites, setFavorites] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [notifs, setNotifs] = useState(INITIAL_NOTIFS);

  const addNotification = (notif) => {
    setNotifs(prev => [{
      id: Date.now(),
      time: 'Just now',
      read: false,
      ...notif
    }, ...prev]);
  };

  const clearNotifications = () => setNotifs([]);
  const markNotificationRead = (id) => setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));

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
      addBooking,
      notifs,
      addNotification,
      clearNotifications,
      markNotificationRead
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
