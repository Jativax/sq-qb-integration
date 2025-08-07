export async function debugCIEnvironment() {
  if (process.env.CI) {
    console.log('🔍 CI Environment Debug:');
    console.log(
      '- Backend URL:',
      process.env.BACKEND_URL || 'http://localhost:3001'
    );
    console.log(
      '- Frontend URL:',
      process.env.FRONTEND_URL || 'http://localhost:5173'
    );
    console.log('- NODE_ENV:', process.env.NODE_ENV);

    // Check backend health
    try {
      const backendHealth = await fetch(
        `${process.env.BACKEND_URL || 'http://localhost:3001'}/health`
      );
      console.log('- Backend Health:', backendHealth.status);
    } catch (error) {
      console.log('- Backend Health: ❌ Not reachable');
    }

    // Check frontend
    try {
      const frontendResponse = await fetch(
        process.env.FRONTEND_URL || 'http://localhost:5173'
      );
      console.log('- Frontend Status:', frontendResponse.status);
    } catch (error) {
      console.log('- Frontend Status: ❌ Not reachable');
    }
  }
}
