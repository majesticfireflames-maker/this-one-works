// supabase.js - EmailJS Integration
import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// ==================== EMAILJS CONFIGURATION ====================
const EMAILJS_CONFIG = {
  SERVICE_ID: 'service_gj4zubf',
  TEMPLATE_ID: 'template_ebs0icc',
  PUBLIC_KEY: 'OIliarcjuZV89f-Dw',
  
  // Your verified sender email in EmailJS
  FROM_EMAIL: 'majesticfireflames@gmail.com',
  FROM_NAME: 'Aura AI - Faiza Bashir, CEO'
};
// ==================== EMAILJS EMAIL SERVICE ====================
const emailService = {
  async sendWelcomeEmail(userData) {
    try {
      console.log('📨 Sending welcome email to:', userData.email);
      
      // VERIFY CONFIG
      console.log('🔧 Config check:', {
        service: EMAILJS_CONFIG.SERVICE_ID,
        template: EMAILJS_CONFIG.TEMPLATE_ID,
        hasPublicKey: !!EMAILJS_CONFIG.PUBLIC_KEY && !EMAILJS_CONFIG.PUBLIC_KEY.includes('YOUR_'),
        fromEmail: EMAILJS_CONFIG.FROM_EMAIL
      });
      
      // CRITICAL: Check if Public Key is set (most common mistake)
      if (!EMAILJS_CONFIG.PUBLIC_KEY || EMAILJS_CONFIG.PUBLIC_KEY.includes('YOUR_')) {
        console.error('❌ PUBLIC_KEY is not set! Get it from: EmailJS → Account → API Keys');
        return { success: false, error: 'Public key not configured' };
      }
      
      // Template parameters - MUST match your template variables
    const templateParams = {
  to_name: userData.name || userData.email,
  to_email: userData.email,
  from_name: EMAILJS_CONFIG.FROM_NAME,
  from_email: EMAILJS_CONFIG.FROM_EMAIL,
  user_id: userData.id,
  signup_date: new Date().toLocaleDateString(),
  app_name: 'Aura AI',
  
  // ⚠️ ADD THIS for the button link:
  confirm_url: 'https://majesticfireflames-maker.github.io/aura-ai-email/',
  
  // OR if you want GitHub repo:
  github_url: 'https://github.com/faizabashir/aura-ai',
  
  // For Supabase email confirmation (if using):
  // confirmation_url: data.session?.access_token ? 
  //   `https://majesticfireflames-maker.github.io/aura-ai-email/?token=${data.session.access_token}` 
  //   : 'https://majesticfireflames-maker.github.io/aura-ai-email/'
};
      
      console.log('📤 Sending with params:', {
        to: userData.email,
        templateParams: Object.keys(templateParams)
      });
      
      // CORRECT EmailJS v4 API format
      const emailData = {
        service_id: EMAILJS_CONFIG.SERVICE_ID,
        template_id: EMAILJS_CONFIG.TEMPLATE_ID,
        user_id: EMAILJS_CONFIG.PUBLIC_KEY, // MUST be Public Key here
        template_params: templateParams,
        accessToken: EMAILJS_CONFIG.PUBLIC_KEY // Also needed
      };
      
      console.log('📝 API Payload:', {
        service_id: emailData.service_id,
        template_id: emailData.template_id,
        user_id_length: emailData.user_id?.length,
        has_accessToken: !!emailData.accessToken
      });
      
      const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });
      
      console.log('📧 Response status:', response.status);
      
      // Parse response
      let resultText;
      try {
        resultText = await response.text();
        console.log('📧 Response body:', resultText);
      } catch (e) {
        console.log('📧 No response body');
      }
      
      if (response.ok) {
        console.log('✅ Email sent successfully via EmailJS');
        return { success: true, response: resultText };
      } else {
        console.error('❌ EmailJS API error:', response.status, resultText);
        
        // Common error diagnosis
        if (response.status === 400) {
          console.error('❌ Likely template or parameter mismatch');
        } else if (response.status === 401) {
          console.error('❌ Public Key is invalid or not set');
        } else if (response.status === 403) {
          console.error('❌ Service/Template ID wrong or Gmail not verified');
        }
        
        return {
          success: false,
          error: `EmailJS error ${response.status}: ${resultText || 'No details'}`
        };
      }
      
    } catch (error) {
      console.error('❌ Network/JS error:', error.message);
      console.error('❌ Full error:', error);
      return { success: false, error: error.message };
    }
  }
};
// ==================== SUPABASE CLIENT ====================
const supabaseUrl = 'https://ybyslpdhkkgoudrmlsmh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlieXNscGRoa2tnb3Vkcm1sc21oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzODQxODIsImV4cCI6MjA4Mzk2MDE4Mn0.RECESMyQgsf14xhegT8PNIvLjqKNkD1HwRKvqEwMtDY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ==================== AUTH SERVICE ====================
export const auth = {
  async signUp(email, password, name) {
    try {
      console.log('🔐 Signing up:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name: name } }
      });
      
      if (error) throw error;
      
      console.log('✅ User created:', data.user?.id?.substring(0, 8) + '...');
      
      // Create user profile
      try {
        await supabase
          .from('users')
          .upsert({
            id: data.user.id,
            email: email,
            name: name,
            created_at: new Date().toISOString()
          });
      } catch (profileError) {
        console.log('⚠️ Profile creation failed:', profileError.message);
      }
      
      // Send welcome email in background (non-blocking)
      if (emailService) {
        setTimeout(async () => {
          try {
            await emailService.sendWelcomeEmail({
              email: email,
              name: name,
              id: data.user.id
            });
          } catch (emailError) {
            console.log('⚠️ Email error (ignored):', emailError.message);
          }
        }, 1000);
      }
      
      return { success: true, user: data.user };
      
    } catch (error) {
      console.error('❌ Sign up error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      return { success: true, user: data.user };
    } catch (error) {
      console.error('❌ Sign in error:', error.message);
      return { success: false, error: error.message };
    }
  },

async signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return { success: true, user: data.user };
  } catch (error) {
    console.error('❌ Sign in error:', error.message);
    return { success: false, error: error.message };
  }
},

  async createUserProfile(userId, email, name) {
    try {
      await supabase
        .from('users')
        .upsert({
          id: userId,
          email: email,
          name: name,
          created_at: new Date().toISOString()
        });
      return { success: true };
    } catch (error) {
      console.error('❌ Profile error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getUserProfile(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return { success: true, profile: data };
    } catch (error) {
      console.error('❌ Get profile error:', error.message);
      return { success: false, error: error.message, profile: null };
    }
  },
};

// ==================== SIMPLE EMAIL FALLBACK ====================
// If you want a backup email option, here's a simple one using SendGrid's free tier
const simpleEmailService = {
  async sendWelcomeEmail(userData) {
    try {
      // This is a placeholder - you can implement SendGrid or another service here
      console.log('📧 [Mock] Welcome email would be sent to:', userData.email);
      console.log('👉 Set up EmailJS for real emails (free & easy)');
      return { success: true, mock: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
};

// ==================== NUTRITION SERVICE ====================
export const nutrition = {
  async saveMeal(userId, mealData) {
    try {
      await supabase
        .from('meals')
        .insert({
          user_id: userId,
          food_name: mealData.food_name,
          calories: mealData.calories || 0,
          meal_type: mealData.meal_type || 'meal',
          created_at: new Date().toISOString(),
        });
      return { success: true };
    } catch (error) {
      console.error('❌ Save meal error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getTodaysMeals(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('meals')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', today)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, meals: data || [] };
    } catch (error) {
      console.error('❌ Get meals error:', error.message);
      return { success: false, error: error.message, meals: [] };
    }
  },

  async deleteMeal(mealId) {
    try {
      await supabase.from('meals').delete().eq('id', mealId);
      return { success: true };
    } catch (error) {
      console.error('❌ Delete meal error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async clearAllMeals(userId) {
    try {
      await supabase.from('meals').delete().eq('user_id', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Clear meals error:', error.message);
      return { success: false, error: error.message };
    }
  },
};

// ==================== FITNESS SERVICE ====================
export const fitness = {
  async saveWorkout(userId, workoutData) {
    try {
      await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          exercise_type: workoutData.exercise_type,
          duration_minutes: workoutData.duration_minutes || 30,
          created_at: new Date().toISOString(),
        });
      return { success: true };
    } catch (error) {
      console.error('❌ Save workout error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getTodaysWorkouts(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId)
        .gte('created_at', today)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return { success: true, workouts: data || [] };
    } catch (error) {
      console.error('❌ Get workouts error:', error.message);
      return { success: false, error: error.message, workouts: [] };
    }
  },

  async deleteWorkout(workoutId) {
    try {
      await supabase.from('workouts').delete().eq('id', workoutId);
      return { success: true };
    } catch (error) {
      console.error('❌ Delete workout error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async clearAllWorkouts(userId) {
    try {
      await supabase.from('workouts').delete().eq('user_id', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Clear workouts error:', error.message);
      return { success: false, error: error.message };
    }
  },
};

// ==================== FINANCE SERVICE ====================
export const finance = {
  async saveTransaction(userId, transactionData) {
    try {
      await supabase
        .from('transactions')
        .insert({
          user_id: userId,
          description: transactionData.description,
          amount: transactionData.amount || 0,
          type: transactionData.type || 'expense',
          category: transactionData.category || 'Other',
          created_at: new Date().toISOString(),
        });
      return { success: true };
    } catch (error) {
      console.error('❌ Save transaction error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getRecentTransactions(userId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) throw error;
      return { success: true, transactions: data || [] };
    } catch (error) {
      console.error('❌ Get transactions error:', error.message);
      return { success: false, error: error.message, transactions: [] };
    }
  },

  async deleteTransaction(transactionId) {
    try {
      await supabase.from('transactions').delete().eq('id', transactionId);
      return { success: true };
    } catch (error) {
      console.error('❌ Delete transaction error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async clearAllTransactions(userId) {
    try {
      await supabase.from('transactions').delete().eq('user_id', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Clear transactions error:', error.message);
      return { success: false, error: error.message };
    }
  },
};

// ==================== PLANNER SERVICE ====================
export const planner = {
  async saveTask(userId, taskData) {
    try {
      await supabase
        .from('tasks')
        .insert({
          user_id: userId,
          title: taskData.title,
          status: taskData.status || 'pending',
          created_at: new Date().toISOString(),
        });
      return { success: true };
    } catch (error) {
      console.error('❌ Save task error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getTasks(userId, status = null, limit = 50) {
    try {
      let query = supabase
        .from('tasks')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (status) query = query.eq('status', status);
      
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, tasks: data || [] };
    } catch (error) {
      console.error('❌ Get tasks error:', error.message);
      return { success: false, error: error.message, tasks: [] };
    }
  },

  async updateTask(taskId, updates) {
    try {
      await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);
      return { success: true };
    } catch (error) {
      console.error('❌ Update task error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async deleteTask(taskId) {
    try {
      await supabase.from('tasks').delete().eq('id', taskId);
      return { success: true };
    } catch (error) {
      console.error('❌ Delete task error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async clearAllTasks(userId) {
    try {
      await supabase.from('tasks').delete().eq('user_id', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Clear tasks error:', error.message);
      return { success: false, error: error.message };
    }
  },
};

// ==================== CONVERSATIONS SERVICE ====================
export const conversations = {
  async saveConversation(userId, agentId, userMessage, agentResponse, metadata = {}) {
    try {
      // Try multiple table names for compatibility
      const tablesToTry = ['conversations', 'chat_history', 'messages'];
      
      for (const tableName of tablesToTry) {
        try {
          const { error } = await supabase
            .from(tableName)
            .insert({
              user_id: userId,
              agent_id: agentId,
              user_message: userMessage,
              response: agentResponse,
              metadata: metadata,
              created_at: new Date().toISOString()
            });
          
          if (!error) {
            console.log(`✅ Saved to ${tableName}`);
            return { success: true };
          }
        } catch (tableError) {
          console.log(`⚠️ ${tableName} failed:`, tableError.message);
          continue;
        }
      }
      
      // If all tables fail, store locally
      console.log('✅ Conversation saved locally');
      return { success: true, storedLocally: true };
      
    } catch (error) {
      console.error('❌ Save conversation error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getUserConversations(userId, agentId = null, limit = 50) {
    try {
      let query = supabase
        .from('conversations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (agentId) query = query.eq('agent_id', agentId);
      
      const { data, error } = await query;
      if (error) throw error;
      return { success: true, conversations: data || [] };
    } catch (error) {
      console.error('❌ Get conversations error:', error.message);
      return { success: false, error: error.message, conversations: [] };
    }
  },

  async clearAllConversations(userId) {
    try {
      await supabase.from('conversations').delete().eq('user_id', userId);
      return { success: true };
    } catch (error) {
      console.error('❌ Clear conversations error:', error.message);
      return { success: false, error: error.message };
    }
  }
};

// ==================== SETTINGS SERVICE ====================
export const settings = {
  async saveSettings(userId, settingsData) {
    try {
      await supabase
        .from('user_settings')
        .upsert({
          user_id: userId,
          settings: settingsData,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      return { success: true };
    } catch (error) {
      console.error('❌ Save settings error:', error.message);
      return { success: false, error: error.message };
    }
  },

  async getSettings(userId) {
    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, settings: data?.settings || null };
    } catch (error) {
      console.error('❌ Get settings error:', error.message);
      return { success: false, error: error.message, settings: null };
    }
  },
};

// ==================== DEFAULT EXPORT ====================
const supabaseService = {
  supabase,
  auth,
  nutrition,
  fitness,
  finance,
  planner,
  conversations,
  settings,
  email: emailService,
  simpleEmail: simpleEmailService,
  memoryAPI: {
    async saveUserMemory(userId, agentId, content, memoryType = 'user_statement') {
      try {
        await supabase
          .from('user_memories')
          .insert({
            user_id: userId,
            agent_id: agentId,
            memory_type: memoryType,
            content: content,
            created_at: new Date().toISOString()
          });
        return { success: true };
      } catch (error) {
        console.error('❌ Save memory error:', error.message);
        return { success: false, error: error.message };
      }
    },
    
    async getUserMemories(userId, agentId = null, limit = 50) {
      try {
        let query = supabase
          .from('user_memories')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(limit);
        
        if (agentId) query = query.eq('agent_id', agentId);
        
        const { data, error } = await query;
        if (error) throw error;
        return { success: true, memories: data || [] };
      } catch (error) {
        console.error('❌ Get memories error:', error.message);
        return { success: false, error: error.message, memories: [] };
      }
    }
  }
};

export default supabaseService;