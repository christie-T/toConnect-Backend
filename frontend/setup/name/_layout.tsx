///////////////For web only//////////////////////////////
/**/import { NativeWindStyleSheet } from "nativewind";///
/**/                                                  ///                   
/**/NativeWindStyleSheet.setOutput({                  ///
/**/  default: "native",                              ///
/**/});                                               ///
/////////////////////////////////////////////////////////
import React, { useContext, useEffect, useReducer } from 'react';
import axios, { AxiosError } from 'axios';
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import { Input } from 'react-native-elements';
import { LoginContext } from "../../../lib/sessionProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { initialState, reducer } from "../../profile/_layout";
import { BASE_URL } from "../../server_config";

axios.defaults.withCredentials = true;
process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';


export default function Name() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const auth = useContext(LoginContext);
    const navigation = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        if (auth.session) {
            getProfile();
        }
    }, [auth.session]);

    async function getProfile() {
        try {
            dispatch({ type: 'setLoading', payload: true });
            if (!auth.session?.user) throw new Error('No user in the session!');
    
            const response = await fetch(`${BASE_URL}/profile/`, {
                method: 'GET',
                credentials: 'include', 
            });
    
            const data = await response.json();
    
            if (response.ok) {
                dispatch({ type: 'setName', payload: data.full_name });
                dispatch({ type: 'setAvatarUrl', payload: data.avatar_url });
                dispatch({ type: 'setLocation', payload: data.location });
                dispatch({ type: 'setAgeRange', payload: data.age_range });
                dispatch({ type: 'setBio', payload: data.bio });
                dispatch({ type: 'setInterests', payload: data.interests });
                dispatch({ type: 'setLookingFor', payload: data.looking_for });
            } else {
                throw new Error(data.error || 'Failed to fetch profile');
            }
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert(error.message);
            } else {
                Alert.alert('An unexpected error occurred');
            }
        } finally {
            dispatch({ type: 'setLoading', payload: false });
        }
    }
    
    interface ProfileData {
        full_name: string;
    }

    async function updateName({ full_name }: ProfileData) {
        try {
            dispatch({ type: 'setLoading', payload: true });
        
            const response = await axios.post(`${BASE_URL}/profile/update`, {
                full_name,
            },  {
                withCredentials: true, // send cookies with request
            });
        
            // debug
            console.log('Response Status:', response.status);
            console.log('Response Data:', response.data);
        
            if (response.status === 201) {
                console.log('Profile updated successfully');
            } else {
                throw new Error(response.data.error || 'Failed to update profile');
            }
        } catch (error) {
            // log error if its an axios error (debug)
            if (error instanceof AxiosError) {
                console.log('Caught Axios error:', error.message);
                Alert.alert(error.message);
            } else if (error instanceof Error) {
                console.log('Caught error:', error.message);
                Alert.alert(error.message);
            } else {
                console.log('Caught unknown error:', error);
                Alert.alert('An unexpected error occurred');
            }
        } finally {
            dispatch({ type: 'setLoading', payload: false });
        }
    }

    return (
        <KeyboardAwareScrollView keyboardDismissMode='on-drag' scrollEnabled={false} className="bg-[#151515]">
            <View className="h-screen">
                <View className="py-4 mt-20 flex justify-center items-center">
                    <Text className="text-4xl text-white font-bold">What's your name?</Text>
                </View>
                <View className="py-4 self-stretch mx-10">
                    <Input
                        placeholder="Name"
                        value={state.name || ''}
                        onChangeText={(text) => dispatch({ type: 'setName', payload: text })}
                        autoCapitalize={'none'}
                        inputContainerStyle={{ borderBottomWidth: 0 }}
                        className="border-[#ffba03] border rounded-xl pl-2 text-white"
                    />
                    <Text className="text-red-400 text-md text-left ml-2">{state.error}</Text>
                </View>
                <TouchableOpacity
                    className="bg-[#ffba03] rounded-full mx-8 py-4 mb-12 mt-auto"
                    onPress={async () => {
                        if (state.name && state.name.length > 0) {
                            await updateName({ full_name: state.name });
                            navigation.push({ pathname: '/setup/image' });
                        } else {
                            dispatch({ type: 'setError', payload: 'Name cannot be empty!' });
                        }
                    }}
                >
                    <View className="flex justify-center items-center">
                        <Text className="text-white text-xl font-bold">Next</Text>
                    </View>
                </TouchableOpacity>
            </View>
        </KeyboardAwareScrollView>
    );
}