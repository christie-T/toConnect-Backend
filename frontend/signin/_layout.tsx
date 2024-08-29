///////////////For web only//////////////////////////////
/**/import { NativeWindStyleSheet } from "nativewind";///
/**/                                                  ///                   
/**/NativeWindStyleSheet.setOutput({                  ///
/**/  default: "native",                              ///
/**/});                                               ///
/////////////////////////////////////////////////////////
import React, { useState } from 'react';
import axios, { AxiosError } from 'axios';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Input } from 'react-native-elements';
import { useRouter, Link } from 'expo-router';
import { BASE_URL } from '../server_config.js'; // Adjust the import path if necessary

axios.defaults.withCredentials = true;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


interface SignInResponse {
    message?: string;
    error?: string;
}

export default function SignIn() {
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const navigation = useRouter();

  async function signInWithEmail() {
      setLoading(true);
      try {
          const response = await axios.post(`${BASE_URL}/signin`, {
              email,
              password
          }, {
              withCredentials: true, // Ensure cookies are sent with the request
          });

          if (response.status === 201) {
              navigation.push({ pathname: '/setup' });
          } else {
              setError(response.data.error || 'An error occurred');
              if (response.data.error === 'Email not confirmed') {
                  navigation.push({ pathname: '/VerifyEmail', params: { email } });
              }
          }
      } catch (err) {
          const error = err as AxiosError<SignInResponse>;
          if (error.response && error.response.data) {
              setError(error.response.data.error || 'An error occurred');
              if (error.response.data.error === 'Email not confirmed') {
                  navigation.push({ pathname: '/VerifyEmail', params: { email } });
              }
          } else {
              setError('An unexpected error occurred');
          }
      }
      setLoading(false);
  }

    return (
        <View className='px-12 flex-auto absolute top-0 bottom-0 right-0 left-0'>
            {/* Background circles omitted for brevity */}
            <ScrollView keyboardDismissMode='on-drag' scrollEnabled={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                <View className='self-stretch'>
                    <Text className='text-4xl mb-12 font-bold text-center'>Sign In</Text>
                    <Input
                        className="bg-white px-2 rounded-xl text-center border"
                        onChangeText={(text) => setEmail(text)}
                        value={email}
                        placeholder="Email@address.com"
                        autoCapitalize='none'
                        inputContainerStyle={{ borderBottomWidth: 0 }}
                    />
                </View>
                <View className='pt-1 self-stretch'>
                    <Input
                        className="bg-white px-2 rounded-xl text-center"
                        onChangeText={(text) => setPassword(text)}
                        value={password}
                        secureTextEntry={true}
                        placeholder="Password"
                        autoCapitalize='none'
                        inputContainerStyle={{ borderBottomWidth: 0 }}
                    />
                </View>
                <View className='pb-2 self-stretch flex justify-center items-center'>
                    <Text className="text-lg text-red-500">{error}</Text>
                </View>
                <View className='flex flex-row justify-center items-center font-bold mb-6'>
                    <Text className="text-md text-gray-500">Click here to</Text>
                    <Link className='ml-2 text-md font-medium text-[#ffba03] underline' href='/signup'>
                        Register
                    </Link>
                </View>
                <View className='self-stretch'>
                    <TouchableOpacity className="bg-white rounded-full mx-16" disabled={loading} onPress={() => { signInWithEmail() }}>
                        <Text className='text-center font-medium py-4 text-xl'>Log In</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}