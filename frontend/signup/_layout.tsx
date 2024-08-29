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
import { BASE_URL } from '../server_config.js'; 

interface SignUpResponse {
    message?: string;
    error?: string;
}

axios.defaults.withCredentials = true;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


export default function SignUp() {
    const [email, setEmail] = useState<string>('');
    const [password, setPassword] = useState<string>('');
    const [confirmPassword, setConfirmPassword] = useState<string>('');
    const [error, setError] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const navigation = useRouter();

    async function signUpWithEmail() {
        setLoading(true);
        try {
          const response = await axios.post(`${BASE_URL}/signup`, {
            email: email,
            password: password,
            confirmPassword: confirmPassword,
        }, {
            withCredentials: true, // send cookies with the request
        });

            if (response.status === 201) {
                navigation.push({ pathname: '/setup' });
            } else {
                setError(response.data.error || 'An error occurred');
            }
        } catch (err) {
            const error = err as AxiosError<SignUpResponse>;
            if (error.response && error.response.data) {
                setError(error.response.data.error || 'An error occurred');
            } else {
                setError('An error occurred');
            }
        }
        setLoading(false);
    }

    return (
        <View className='px-12 flex-auto absolute top-0 bottom-0 right-0 left-0 bg-white'>
            {/* Background circles omitted for brevity */}
            <ScrollView keyboardDismissMode='on-drag' scrollEnabled={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
                <View className='self-stretch'>
                    <Text className='text-4xl mb-12 font-bold text-center'>Sign Up</Text>
                    <Input
                        className="bg-white px-2 rounded-xl text-center border"
                        onChangeText={(text) => setEmail(text)}
                        value={email}
                        placeholder="Email@address.com"
                        autoCapitalize='none'
                        inputContainerStyle={{ borderBottomWidth: 0 }}
                    />
                </View>
                <View className='py-1 self-stretch'>
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
                <View className='pt-1 self-stretch'>
                    <Input
                        className="bg-white px-2 rounded-xl text-center"
                        onChangeText={(text) => setConfirmPassword(text)}
                        value={confirmPassword}
                        secureTextEntry={true}
                        placeholder="Confirm Password"
                        autoCapitalize='none'
                        inputContainerStyle={{ borderBottomWidth: 0 }}
                    />
                </View>
                <View className='pb-2 self-stretch flex justify-center items-center'>
                    <Text className="text-lg text-red-500">{error}</Text>
                </View>
                <View className='flex flex-row justify-center items-center font-bold mb-6'>
                    <Text className="text-md text-gray-500">Already have an account?</Text>
                    <Link className='ml-2 text-md font-medium text-[#ffba03] underline' href='/signin'>
                        Log In
                    </Link>
                </View>
                <View className='self-stretch'>
                    <TouchableOpacity className="bg-[#ffba03] rounded-full mx-16" disabled={loading} onPress={() => {
                        if (password === confirmPassword && password !== '' && confirmPassword !== '') {
                            signUpWithEmail();
                        } else {
                            setError('Passwords do not match');
                        }
                    }}>
                        <Text className='text-center font-medium text-white py-4 text-xl'>Register</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
  }