import Admin from '../models/Admin.js';

/**
 * Creates an initial admin user if none exists
 * This is useful for initial setup
 */
export const createInitialAdmin = async () => {
  try {
    // Check if any admin exists
    const adminCount = await Admin.countDocuments();
    
    if (adminCount === 0) {
      // Create default admin
      const defaultAdmin = new Admin({
        name: 'Admin User',
        email: 'admin@cravebites.com',
        password: 'admin123'
      });
      
      await defaultAdmin.save();
      console.log('✅ Initial admin created:');
      console.log('   Email: admin@cravebites.com');
      console.log('   Password: admin123');
    }
  } catch (error) {
    console.error('Error creating initial admin:', error);
  }
}; 