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
import { Dropdown } from "react-native-element-dropdown";
import axios from 'axios';
import { BASE_URL } from "../../server_config";

const age = [
    { label: '18-25', value: '1' },
    { label: '26-35', value: '2' },
    { label: '36-45', value: '3' },
    { label: '46+', value: '4' },
  ];

export default function Age() {
    const [state, dispatch] = useReducer(reducer, initialState);
    const auth = useContext(LoginContext)
    const navigation = useRouter();
    const params = useLocalSearchParams();

    useEffect(() => {
        if (auth.session) {
            getProfile()
        
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

    async function updateAge({
        age_range
    }: {
        age_range: string
    }) {
        try {
            dispatch({ type: 'setLoading', payload: true })
    
            const response = await axios.post(`${BASE_URL}/profile/age`, {
                age_range,
            }, {
                withCredentials: true, 
            })
    
            if (response.status !== 201) { 
                throw new Error('Failed to update age range')
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
                <Text className="text-4xl text-white font-bold mx-6 ">What's your Age Range?</Text>
            </View>
            <Text className="text-white text-lg text-center mx-6">{state.ageRange}</Text>
            
            <View className="py-4 self-stretch mx-10">
                <Dropdown
                style={{
                    borderColor: '#ffba03', // Similar to border-[#ffba03]
                    borderWidth: 1, // Similar to border
                    borderRadius: 10, // Similar to rounded-xl
                    paddingHorizontal: 10, // Similar to px-2
                    borderStyle: 'dotted',
                    width: '100%',
                }}
                placeholderStyle={{
                    color: 'white', // Similar to text-white
                    fontSize: 14, // Similar to text-sm
                    padding: 1, // Similar to p-1
                }}
                selectedTextStyle={{
                    color: 'white', // Similar to text-white
                    fontSize: 14, // Similar to text-sm
                    fontWeight: 'bold', // Similar to font-bold
                }}
                inputSearchStyle={{
                    color: 'white', // Similar to text-white
                    fontSize: 14, // Similar to text-sm
                    padding: 1, // Similar to p-1
                }}
                itemContainerStyle={{
                    backgroundColor: '#151515', // Similar to bg-[#151515]
                    borderColor: '#ffba03', // Similar to border-[#ffba03]
                    borderRadius: 10, // Similar to rounded-xl
                    paddingHorizontal: 10, // Similar to px-2
                    paddingVertical: 5, // Similar to py-1
                }}
                itemTextStyle={{
                    color: 'white', // Similar to text-white
                    fontSize: 14, // Similar to text-sm
                    padding: 1, // Similar to p-1
                }}
                containerStyle={{
                    backgroundColor: '#151515', // Similar to bg-[#151515]
                    borderColor: '#ffba03', // Similar to border-[#ffba03]
                    borderRadius: 10, // Similar to rounded-xl
                    paddingHorizontal: 10, // Similar to px-2
                    paddingVertical: 5, // Similar to py-1
                }}
                
                data={age.filter((item) => !(state.ageRange == item.label))}
                maxHeight={400}
                labelField="label"
                valueField="value"
                placeholder="Choose your age range" 
                searchPlaceholder="Search..."
                onChange={async item => {
                    dispatch({type: 'setAgeRange', payload: item.label})
                    await updateAge({age_range: item.label})
                }}
                />                 
                <Text className="text-red-400 text-md text-left ml-2">{state.error}</Text>
            </View>
            
            <TouchableOpacity className="bg-[#ffba03] rounded-full mx-8 py-4 mb-12 mt-auto"
                onPress={() => {
                    if(state.ageRange) {
                        navigation.push({pathname: '/setup/interests'});
                    }
                    else
                        dispatch({type: 'setError', payload: 'Name cannot be empty!'});
                                }}>
                <View className="flex justify-center items-center">
                    <Text className="text-white text-xl font-bold">Next</Text>
                </View>
            </TouchableOpacity> 
            </View>
            </KeyboardAwareScrollView>
    )};