///////////////For web only//////////////////////////////
/**/import { NativeWindStyleSheet } from "nativewind";///
/**/                                                  ///                   
/**/NativeWindStyleSheet.setOutput({                  ///
/**/  default: "native",                              ///
/**/});                                               ///
/////////////////////////////////////////////////////////
import React, { useState } from 'react'
import { Alert, Text, TouchableOpacity, View, KeyboardAvoidingView, ScrollView, Platform  } from 'react-native'
import { supabase } from '../../lib/supabase'
import { Button, Input } from 'react-native-elements'
import { useRouter, Link } from 'expo-router';
import { BASE_URL } from '../server_config.js'

export default function SignUp() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const navigation = useRouter();

    async function signUpWithEmail() {
      setLoading(true)
      try {
          const response = await fetch(`${BASE_URL}/signup`, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  email: email,
                  password: password,
                  confirmPassword: confirmPassword,
              }),
          });
          const data = await response.json();
          if (response.ok) {
            navigation.push({ pathname: '/setup'});
              // navigation.push({ pathname: '/VerifyEmail', params: { email } });
          } else {
              setError(data.error);
          }
      } catch (error) {
          setError('An error occurred');
      }
      setLoading(false);
  }

    // async function signUpWithEmail() {
    //     setLoading(true)
    //     const {
    //       data: { session },
    //       error,
    //     } = await supabase.auth.signUp({
    //       email: email,
    //       password: password,
    //     })
    
    //     if (error) 
    //       setError(error.message)
    //     else if (!session) {
    //       navigation.push({pathname: '/VerifyEmail', params: {email}})
    //     }
    //     setLoading(false)
    //   }

    return (

    <View className='px-12 flex-auto absolute top-0 bottom-0 right-0 left-0 bg-white '>
      <View style=
        {{shadowColor: 'black',
          shadowOpacity: 2,
          elevation: 3,
        }} 
        className="absolute right-0 top-0 -mr-10 -mt-40 w-60 h-60 rounded-full bg-white z-5 " />
      <View style=
        {{shadowColor: 'black',
          shadowOpacity: 2,
          elevation: 3}} 
          className="absolute right-0 top-0 -mr-32 -mt-20 w-60 h-60 rounded-full bg-white z-0" />
      <View style=
        {{shadowColor: 'black',
          shadowOpacity: 2,
          elevation: 3}} 
          className="absolute left-0 bottom-0 -ml-20 -mb-40 w-60 h-60 rounded-full bg-white z-10 shadow-none" />
      <View style=
        {{shadowColor: 'black',
          shadowOpacity: 2,
          elevation: 3,
        }} 
        className="absolute left-0 bottom-0 -ml-40 -mb-20 w-60 h-60 rounded-full bg-white z-0 shadow-none" />
        {/*<TouchableOpacity className='absolute top-0 left-0 ml-24 -mt-20 bg-white' onPress={() => navigation.back()} >
          <View style=
          {{shadowColor: 'black',
            shadowOpacity: 2,
            elevation: 3}} 
            className="absolute left-0 bottom-0 -ml-20 -mb-40 w-9 h-9 rounded-full bg-[#ffba03] z-10 shadow-none" >
              <Text className='text-3xl text-white font-bold text-center'>&lt;</Text>
              </View>
      </TouchableOpacity>*/}
      <ScrollView keyboardDismissMode='on-drag' scrollEnabled={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>

          <View className='self-stretch'>
            <Text className='text-4xl mb-12  font-bold text-center'>Sign Up</Text>
            <Input
              className="bg-white px-2 rounded-xl text-center border"
              //leftIcon={{ type: 'font-awesome', name: 'envelope' }}
              onChangeText={(text) => setEmail(text)}
              value={email}
              placeholder="Email@address.com"
              autoCapitalize={'none'}
              inputContainerStyle={{borderBottomWidth: 0}}
            />
          </View>
          <View className='py-1 self-stretch '>
            <Input
              className="bg-white px-2 rounded-xl text-center"
              //leftIcon={{ type: 'font-awesome', name: 'lock' }}
              onChangeText={(text) => setPassword(text)}
              value={password}
              secureTextEntry={true}
              placeholder="Password"
              autoCapitalize={'none'}
              inputContainerStyle={{borderBottomWidth: 0}}

            />
            </View>
            <View className='pt-1 self-stretch'>
            <Input
              className="bg-white px-2 rounded-xl text-center"
              //leftIcon={{ type: 'font-awesome', name: 'lock' }}
              onChangeText={(text) => setConfirmPassword(text)}
              value={confirmPassword}
              secureTextEntry={true}
              placeholder="Confirm Password"
              autoCapitalize={'none'}
              inputContainerStyle={{borderBottomWidth: 0}}

            />
          </View>
            <View className='pb-2 self-stretch flex justify-center items-center'>
                <Text className="text-lg text-red-500">{error}</Text>
            </View>
            <View className='flex flex-row justify-center items-center font-bold mb-6 '>
                  <Text className=" text-md text-gray-500"> 
                      Already have an account?
                  </Text>
                  <Link className='ml-2 text-md font-medium text-[#ffba03] underline' 
                      href='/signin'>
                      Log In
                  </Link>
              </View>
          <View className='self-stretch'>
            <TouchableOpacity className="bg-[#ffba03] rounded-full mx-16" disabled={loading} onPress={() => {
                if (password === confirmPassword && password !== '' && confirmPassword !== '') {
                    signUpWithEmail()
                }
                else 
                    setError('Passwords do not match')
            }} >
              <Text className='text-center font-medium text-white py-4 text-xl'>Register</Text>
            </TouchableOpacity>
          </View>

      </ScrollView>
      
    </View>
    )
}