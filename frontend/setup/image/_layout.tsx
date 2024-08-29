///////////////For web only//////////////////////////////
/**/import { NativeWindStyleSheet } from "nativewind";///
/**/                                                  ///                   
/**/NativeWindStyleSheet.setOutput({                  ///
/**/  default: "native",                              ///
/**/});                                               ///
/////////////////////////////////////////////////////////
import { useContext, useEffect, useReducer } from 'react'
import { View, Alert, Text, TouchableOpacity } from 'react-native'
import {  Input } from 'react-native-elements'
import { LoginContext } from "../../../lib/sessionProvider";
import { useLocalSearchParams, useRouter } from "expo-router";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { initialState, reducer } from "../../profile/_layout";
import Avatar from "../../../components/Avatar";
import axios from 'axios';
import { BASE_URL } from "../../server_config";

export default function Image() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const auth = useContext(LoginContext)
    const navigation = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        if (auth.session) {
            getProfile()
           /* if (params.isSetup !== undefined && params.isSetup === 'true') {
                dispatch({type: 'setIsSetup', payload: true})
                dispatch({type: 'setIsNamePage', payload: false})
                dispatch({type: 'setIsImagePage', payload: false})
            }
            else
                dispatch({type: 'setIsNamePage', payload: true})*/

            //auth.setSession(auth.session)
        }
        //Alert.alert(state.isNamePage)
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

    async function updateImage({
        avatar_url,
    }: {
        avatar_url: string
    }) {
        try {
            dispatch({ type: 'setLoading', payload: true })
    
            const response = await axios.post(`${BASE_URL}/profile/image`, {
                avatar_url,
            }, {
                withCredentials: true, // Important for sending cookies
            })
    
            if (response.status !== 200) {
                throw new Error('Failed to update avatar')
            }
    
        } catch (error) {
            if (error instanceof Error) {
                Alert.alert(error.message)
            }
        } finally {
            dispatch({ type: 'setLoading', payload: false })
        }
    }
    return (
        
        <KeyboardAwareScrollView keyboardDismissMode='on-drag' scrollEnabled={false} className="bg-[#151515]">
        
        <View className="h-screen">
            <View className="py-4 mt-20 flex justify-center items-center">
                <Text className="text-4xl text-white font-bold ">Add your photo.</Text>
            </View>
            <View className=" flex justify-center items-center">
                <Text className="text-md text-white font-bold text-left py-4">Select a picture of yourself</Text>
            </View>
            <View className="py-4 self-stretch flex justify-center items-center">
                <Avatar
                    size={200}
                    url={state.avatarUrl}
                    uploadVisible={true}
                    onUpload={async (url: string) => {
                    dispatch({type: 'setAvatarUrl', payload: url})
                    await updateImage({ avatar_url: url})
                }}
                />
                <Text className="text-red-400 text-md text-left ml-2">{state.error}</Text>
            </View>
            <TouchableOpacity className="bg-[#ffba03] rounded-full mx-8 py-4 mb-12 mt-auto"
                onPress={() => {
                    if(state.avatarUrl !== null && state.avatarUrl !== '') {
                        navigation.push({pathname: '/setup/age'});
                    }
                    else
                        dispatch({type: 'setError', payload: 'Please add an image.'});
                                }}>
                <View className="flex justify-center items-center">
                    <Text className="text-white text-xl font-bold">Next</Text>
                </View>
            </TouchableOpacity> 
            </View>
            </KeyboardAwareScrollView>
    )};